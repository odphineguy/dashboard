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
    const { newPriceId, newPlanTier, userId: bodyUserId } = body

    if (!newPriceId || !newPlanTier) {
      throw new Error('Missing required parameters: newPriceId, newPlanTier')
    }

    // Try to get user ID from multiple sources (in order of preference):
    let userId = bodyUserId

    if (!userId) {
      const clerkToken = req.headers.get('x-clerk-token')
      if (clerkToken) {
        const clerkPayload = decodeJWT(clerkToken)
        userId = clerkPayload?.sub
      }
    }

    if (!userId) {
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

    console.log('User ID for subscription update:', userId)

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, status, plan_tier')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !subscription?.stripe_subscription_id) {
      console.error('No active subscription found:', subError)
      throw new Error('No active subscription found')
    }

    console.log('Current subscription:', subscription.stripe_subscription_id, 'tier:', subscription.plan_tier)
    console.log('Updating to:', newPlanTier, 'price:', newPriceId)

    // Get current subscription from Stripe to find the subscription item
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
    
    if (!stripeSubscription.items.data.length) {
      throw new Error('No subscription items found')
    }

    const subscriptionItemId = stripeSubscription.items.data[0].id

    // Update the subscription to the new price
    // proration_behavior: 'create_prorations' will credit the user for unused time
    const updatedSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{
        id: subscriptionItemId,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
      metadata: {
        plan_tier: newPlanTier,
      }
    })

    console.log('Subscription updated:', updatedSubscription.id, 'status:', updatedSubscription.status)

    // Update local database immediately (webhook will also update, but this gives instant feedback)
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan_tier: newPlanTier,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id)

    if (updateError) {
      console.error('Error updating local subscription:', updateError)
      // Don't throw - Stripe update succeeded, webhook will sync
    }

    // Update profile subscription tier
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: newPlanTier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        newPlanTier,
        message: `Successfully changed to ${newPlanTier} plan`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    console.error('Error updating subscription:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

