// Supabase Edge Function: Create Stripe Checkout Session
// Purpose: Initiates a Stripe Checkout session for subscription payment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from auth
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Parse request body
    const { priceId, successUrl, cancelUrl, planTier, billingInterval, clerkUserId, userEmail, userName } = await req.json()

    if (!priceId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: priceId, successUrl, cancelUrl' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Determine which user ID to use (Clerk or Supabase)
    const effectiveUserId = clerkUserId || user.id
    const effectiveEmail = userEmail || user.email
    const effectiveName = userName || user.email?.split('@')[0]

    // Get profile - retry if not found (wait for Clerk webhook to complete)
    let { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', effectiveUserId)
      .single()

    // If profile doesn't exist, retry up to 3 times with delay
    if (!profile) {
      console.log('Profile not found, waiting for Clerk webhook to complete...')

      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        const { data: retryProfile } = await supabaseClient
          .from('profiles')
          .select('stripe_customer_id, full_name')
          .eq('id', effectiveUserId)
          .single()

        if (retryProfile) {
          profile = retryProfile
          console.log(`Profile found after ${i + 1} retries`)
          break
        }
      }

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not ready. Please wait a moment and try again.' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }
    }

    let customerId = profile?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: effectiveEmail,
        name: profile?.full_name || effectiveName,
        metadata: {
          user_id: effectiveUserId,
          clerk_user_id: clerkUserId || '',
        },
      })
      customerId = customer.id

      // Update profile with Stripe customer ID
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', effectiveUserId)
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
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
        user_id: effectiveUserId,
        clerk_user_id: clerkUserId || '',
        plan_tier: planTier || 'premium',
        billing_interval: billingInterval || 'month',
      },
      subscription_data: {
        metadata: {
          user_id: effectiveUserId,
          clerk_user_id: clerkUserId || '',
          plan_tier: planTier || 'premium',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
