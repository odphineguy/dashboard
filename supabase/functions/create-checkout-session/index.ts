import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
}

// Decode JWT without verification (Supabase handles verification via the supabase template)
function decodeJWT(token: string): { sub?: string; email?: string; [key: string]: any } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch {
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body first to get userId if provided
    const body = await req.json()
    const { priceId, successUrl, cancelUrl, planTier, billingInterval, userEmail, userName, userId: bodyUserId } = body

    if (!priceId || !successUrl || !cancelUrl || !planTier) {
      throw new Error('Missing required parameters: priceId, successUrl, cancelUrl, planTier')
    }

    // Try to get user ID from multiple sources (in order of preference):
    // 1. From request body (most reliable with Clerk)
    // 2. From x-clerk-token header
    // 3. From Authorization header JWT
    let userId = bodyUserId

    if (!userId) {
      // Try x-clerk-token header
      const clerkToken = req.headers.get('x-clerk-token')
      if (clerkToken) {
        const clerkPayload = decodeJWT(clerkToken)
        userId = clerkPayload?.sub
      }
    }

    if (!userId) {
      // Fall back to Authorization header
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const payload = decodeJWT(token)
        userId = payload?.sub
      }
    }

    if (!userId) {
      throw new Error('Missing user ID. Please provide userId in request body or valid auth token.')
    }

    console.log('Creating checkout session for:', { userId, planTier, billingInterval, priceId })

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user profile including email if not provided
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id
    const email = userEmail || profile?.email
    const name = userName || profile?.full_name

    if (!email) {
      throw new Error('User email is required')
    }

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        name: name || undefined,
        metadata: {
          user_id: userId,
        },
      })
      customerId = customer.id

      // Update profile with customer ID
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)

      console.log('Created new Stripe customer:', customerId)
    } else {
      console.log('Using existing Stripe customer:', customerId)
    }

    // Create checkout session with metadata
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        plan_tier: planTier,
        billing_interval: billingInterval || 'month',
        price_id: priceId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_tier: planTier,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    console.log('Checkout session created:', session.id)

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Error creating checkout session:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
