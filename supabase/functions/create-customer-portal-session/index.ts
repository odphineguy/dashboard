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

// Decode JWT without verification
function decodeJWT(token: string): { sub?: string; [key: string]: any } | null {
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
    const { return_url, userId: bodyUserId } = body

    if (!return_url) {
      throw new Error('Missing required parameter: return_url')
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

    console.log('User ID for portal session:', userId)

    // Initialize Supabase admin client to query profiles
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Profile query error:', profileError)
      throw new Error('Failed to retrieve user profile')
    }

    if (!profile?.stripe_customer_id) {
      throw new Error('No Stripe customer found. Please subscribe first.')
    }

    console.log('Creating customer portal session for:', profile.stripe_customer_id)

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: return_url,
    })

    console.log('Customer portal session created:', session.id)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Error creating customer portal session:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
