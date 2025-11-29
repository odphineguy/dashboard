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
    const { userId, stripeCustomerId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Syncing subscription for user:', userId)

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the user's profile to find their Stripe customer ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, subscription_tier, subscription_status')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const customerId = stripeCustomerId || profile.stripe_customer_id

    if (!customerId) {
      console.log('No Stripe customer ID found, user is on basic tier')
      return new Response(
        JSON.stringify({
          synced: true,
          tier: 'basic',
          status: 'active',
          message: 'No Stripe customer found - basic tier',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Looking up Stripe customer:', customerId)

    // Fetch active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    // Also check for trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'trialing',
      limit: 1,
    })

    const allSubscriptions = [...subscriptions.data, ...trialingSubscriptions.data]

    if (allSubscriptions.length === 0) {
      console.log('No active subscriptions found in Stripe')

      // Check for any subscription (including past_due)
      const anySubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      })

      if (anySubscriptions.data.length > 0) {
        const sub = anySubscriptions.data[0]
        console.log('Found subscription with status:', sub.status)

        // Update profile with actual status
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: sub.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        return new Response(
          JSON.stringify({
            synced: true,
            tier: profile.subscription_tier,
            status: sub.status,
            message: `Subscription found with status: ${sub.status}`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // No subscriptions at all - downgrade to basic
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: 'basic',
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      return new Response(
        JSON.stringify({
          synced: true,
          tier: 'basic',
          status: 'active',
          message: 'No active subscriptions found - reverted to basic',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Found active subscription
    const activeSubscription = allSubscriptions[0]
    console.log('Found active subscription:', activeSubscription.id)

    // Determine plan tier from price ID
    const priceId = activeSubscription.items.data[0].price.id
    let planTier = 'premium' // default

    // Map price IDs to tiers
    const premiumPriceIds = [
      'price_1SKiIoIqliEA9Uot0fgA3c8M', // Premium Monthly
      'price_1SIuGNIqliEA9UotGD93WZdc', // Premium Yearly
    ]
    const householdPriceIds = [
      'price_1SIuGPIqliEA9UotfLjoddkj', // Household Monthly
      'price_1SIuGSIqliEA9UotuHlR3qoH', // Household Yearly
    ]

    if (householdPriceIds.includes(priceId)) {
      planTier = 'household_premium'
    } else if (premiumPriceIds.includes(priceId)) {
      planTier = 'premium'
    }

    console.log('Determined plan tier:', planTier, 'from price:', priceId)

    // Update or create subscription record
    const { error: subError } = await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSubscription.id,
        stripe_price_id: priceId,
        plan_tier: planTier,
        billing_interval: activeSubscription.items.data[0].price.recurring?.interval || 'month',
        status: activeSubscription.status,
        current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: activeSubscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' }
    )

    if (subError) {
      console.error('Error upserting subscription:', subError)
    }

    // Update profile
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: planTier,
        subscription_status: activeSubscription.status,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
      throw profileUpdateError
    }

    console.log(`✅ Subscription synced for user ${userId}: ${planTier} (${activeSubscription.status})`)

    return new Response(
      JSON.stringify({
        synced: true,
        tier: planTier,
        status: activeSubscription.status,
        subscriptionId: activeSubscription.id,
        currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        message: 'Subscription synced successfully from Stripe',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Sync subscription error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

