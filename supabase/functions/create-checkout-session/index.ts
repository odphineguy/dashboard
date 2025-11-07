// Supabase Edge Function: Create Stripe Checkout Session
// Purpose: Initiates a Stripe Checkout session for subscription payment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
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

    // Parse request body first to get Clerk user info
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

    // Clerk is now the auth provider - require clerkUserId
    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing clerkUserId. User must be authenticated with Clerk.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Use service role key to bypass RLS since we're using Clerk auth.
    // The Supabase gateway will accept the anon key; we pass Clerk token separately if needed.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Use Clerk user ID (Clerk handles all authentication)
    const effectiveUserId = clerkUserId
    const effectiveEmail = userEmail || ''
    const effectiveName = userName || effectiveEmail?.split('@')[0] || 'User'

    // Get profile - retry if not found (wait for Clerk webhook to complete)
    const MAX_PROFILE_RETRIES = 5
    const RETRY_DELAY_MS = 500

    let { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', effectiveUserId)
      .single()

    // If profile doesn't exist, retry a few times, then create it if still missing
    if (!profile) {
      console.log('Profile not found, waiting for Clerk webhook to complete...')

      for (let i = 0; i < MAX_PROFILE_RETRIES; i++) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))

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

      // If profile still doesn't exist after retries, create it on-demand
      if (!profile) {
        console.log('Profile still not found after retries, creating on-demand...')
        
        const { data: newProfile, error: createError } = await supabaseClient
          .from('profiles')
          .insert({
            id: effectiveUserId,
            email: effectiveEmail,
            full_name: effectiveName,
            subscription_tier: 'basic',
            subscription_status: 'active',
            onboarding_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('stripe_customer_id, full_name')
          .single()

        if (createError) {
          console.error('Error creating profile on-demand:', createError)
          // If insert fails (e.g., duplicate), try to fetch again
          const { data: fetchedProfile } = await supabaseClient
            .from('profiles')
            .select('stripe_customer_id, full_name')
            .eq('id', effectiveUserId)
            .single()
          
          if (fetchedProfile) {
            profile = fetchedProfile
            console.log('Profile found after insert attempt (race condition)')
          } else {
            return new Response(
              JSON.stringify({ error: 'Failed to create profile. Please try again.' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            )
          }
        } else {
          profile = newProfile
          console.log('Profile created on-demand successfully')
        }
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
