import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { cancelImmediately } = await req.json()

    // Get user's active subscription
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription found')
    }

    console.log('Canceling subscription:', subscription.stripe_subscription_id, 'immediately:', cancelImmediately)

    // Cancel the subscription in Stripe
    let canceledSubscription
    if (cancelImmediately) {
      // Cancel immediately
      canceledSubscription = await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
    } else {
      // Cancel at period end
      canceledSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    }

    console.log('Subscription canceled:', canceledSubscription.id, canceledSubscription.status)

    // Webhook will handle database updates
    return new Response(
      JSON.stringify({
        success: true,
        canceledImmediately: cancelImmediately,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: canceledSubscription.current_period_end,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    console.error('Error canceling subscription:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
