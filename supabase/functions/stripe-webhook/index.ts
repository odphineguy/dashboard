import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    console.error('Missing stripe-signature header or STRIPE_WEBHOOK_SECRET')
    return new Response('Missing signature or secret', { status: 400, headers: corsHeaders })
  }

  try {
    const body = await req.text()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders })
    }

    console.log('Received Stripe webhook event:', event.type)

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

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Processing checkout.session.completed event')
        const session = event.data.object as Stripe.Checkout.Session

        // Extract metadata
        const userId = session.metadata?.user_id
        const planTier = session.metadata?.plan_tier
        const billingInterval = session.metadata?.billing_interval
        const priceId = session.metadata?.price_id

        console.log('Checkout session metadata:', { userId, planTier, billingInterval, priceId })

        if (!userId || !planTier) {
          console.error('Missing required metadata in checkout session:', session.metadata)
          break
        }

        // Check if this is a subscription or one-time payment
        if (!session.subscription) {
          console.log('No subscription in session - might be a one-time payment')
          break
        }

        // Fetch the subscription to get period dates
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        console.log('Retrieved subscription:', subscription.id, subscription.status)

        // Insert subscription record
        const { data: insertedSub, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              stripe_price_id: priceId || subscription.items.data[0].price.id,
              plan_tier: planTier,
              billing_interval: billingInterval || 'month',
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            },
            { onConflict: 'stripe_subscription_id' }
          )
          .select()

        if (subError) {
          console.error('Error inserting/updating subscription:', subError)
          throw subError
        }

        console.log('Subscription record created/updated:', insertedSub)

        // Also update profile directly (in case trigger doesn't fire immediately)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: planTier,
            subscription_status: subscription.status,
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (profileError) {
          console.error('Error updating profile:', profileError)
          throw profileError
        }

        console.log(`✅ Subscription created for user ${userId}: ${planTier}`)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log(`Processing ${event.type} event`)
        const subscription = event.data.object as Stripe.Subscription

        // Find user by stripe_subscription_id
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, plan_tier')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (!existingSub) {
          console.log('No existing subscription found for:', subscription.id)
          break
        }

        // Update subscription record
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          throw updateError
        }

        // Update profile status
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.user_id)

        if (profileError) {
          console.error('Error updating profile status:', profileError)
        }

        console.log(`✅ Subscription updated: ${subscription.id} - ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        console.log('Processing customer.subscription.deleted event')
        const subscription = event.data.object as Stripe.Subscription

        // Find user by stripe_subscription_id
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (!existingSub) {
          console.log('No existing subscription found for:', subscription.id)
          break
        }

        // Update subscription status to canceled
        const { error: deleteError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (deleteError) {
          console.error('Error canceling subscription:', deleteError)
          throw deleteError
        }

        // Downgrade user to basic tier
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'basic',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.user_id)

        if (profileError) {
          console.error('Error downgrading profile:', profileError)
        }

        console.log(`✅ Subscription canceled for user ${existingSub.user_id}`)
        break
      }

      case 'invoice.payment_succeeded': {
        console.log('Processing invoice.payment_succeeded event')
        const invoice = event.data.object as Stripe.Invoice

        // Only process subscription invoices
        if (!invoice.subscription || !invoice.payment_intent) {
          console.log('Skipping non-subscription invoice')
          break
        }

        // Find user by subscription
        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', invoice.subscription as string)
          .single()

        if (!subscription) {
          console.log('No subscription found for invoice:', invoice.id)
          break
        }

        // Log payment history
        const { error: paymentError } = await supabaseAdmin.from('payment_history').upsert(
          {
            user_id: subscription.user_id,
            stripe_payment_intent_id: invoice.payment_intent as string,
            stripe_invoice_id: invoice.id,
            stripe_charge_id: invoice.charge as string,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'succeeded',
            description: invoice.description || 'Subscription payment',
            receipt_url: invoice.hosted_invoice_url,
          },
          { onConflict: 'stripe_payment_intent_id' }
        )

        if (paymentError) {
          console.error('Error logging payment:', paymentError)
        } else {
          console.log(`✅ Payment logged for user ${subscription.user_id}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        console.log('Processing invoice.payment_failed event')
        const invoice = event.data.object as Stripe.Invoice

        if (!invoice.subscription) {
          console.log('Skipping non-subscription invoice')
          break
        }

        // Find user by subscription
        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', invoice.subscription as string)
          .single()

        if (!subscription) {
          console.log('No subscription found for invoice:', invoice.id)
          break
        }

        // Update subscription status to past_due
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription as string)

        // Update profile status
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.user_id)

        console.log(`⚠️ Payment failed for user ${subscription.user_id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Log webhook event in database
    await supabaseAdmin.from('stripe_webhooks_log').insert({
      event_id: event.id,
      event_type: event.type,
      payload: event as any,
      processed: true,
      processed_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Webhook error:', err)

    // Log failed webhook
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      const body = await req.text()
      const event = JSON.parse(body)
      await supabaseAdmin.from('stripe_webhooks_log').insert({
        event_id: event.id || 'unknown',
        event_type: event.type || 'unknown',
        payload: event,
        processed: false,
        error: err.message,
      })
    } catch (logError) {
      console.error('Failed to log webhook error:', logError)
    }

    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
      headers: corsHeaders,
    })
  }
})
