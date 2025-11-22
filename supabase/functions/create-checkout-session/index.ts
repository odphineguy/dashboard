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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth token from headers
    const authHeader = req.headers.get('Authorization')
    const clerkToken = req.headers.get('x-clerk-token')

    if (!authHeader && !clerkToken) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get user from Supabase or Clerk
    let userId: string
    let userEmail: string
    let userName: string | null = null

    if (clerkToken) {
      // Parse Clerk token (you may need to verify it with Clerk's API)
      const { clerkUserId, userEmail: email, userName: name } = await req.json()
      userId = clerkUserId
      userEmail = email
      userName = name
    } else {
      // Get user from Supabase auth
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser()

      if (authError || !user) {
        throw new Error('Unauthorized')
      }

      userId = user.id
      userEmail = user.email!
      userName = user.user_metadata?.full_name || null
    }

    // Parse request body
    const { priceId, successUrl, cancelUrl, planTier, billingInterval } = await req.json()

    if (!priceId || !successUrl || !cancelUrl || !planTier) {
      throw new Error('Missing required parameters: priceId, successUrl, cancelUrl, planTier')
    }

    console.log('Creating checkout session for:', { userId, planTier, billingInterval, priceId })

    // Check if customer already exists
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName || undefined,
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
