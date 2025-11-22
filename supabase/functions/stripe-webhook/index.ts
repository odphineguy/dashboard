// Supabase Edge Function: Stripe Webhook Handler
// Purpose: Handles Stripe webhook events and syncs subscription data to database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Webhook signature or secret missing', { status: 400 })
  }

  let eventId: string | undefined

  try {
    const body = await req.text()

    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    eventId = event.id
    console.log('Webhook event received:', event.type)

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if event already processed (idempotency)
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_webhooks_log')
      .select('processed')
      .eq('event_id', event.id)
      .single()

    if (existingEvent) {
      if (existingEvent.processed) {
        console.log(`Event ${event.id} already processed, skipping`)
        return new Response(JSON.stringify({ received: true, status: 'already_processed' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      // Event exists but not processed - continue
    } else {
      // Log new webhook event
      await supabaseAdmin.from('stripe_webhooks_log').insert({
        event_id: event.id,
        event_type: event.type,
        payload: event.data.object,
        processed: false,
      })
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session, supabaseAdmin)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription, supabaseAdmin)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, supabaseAdmin)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice, supabaseAdmin)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice, supabaseAdmin)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark webhook as processed
    await supabaseAdmin
      .from('stripe_webhooks_log')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('event_id', event.id)

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)

    // Log error to database if possible
    if (eventId) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabaseAdmin
          .from('stripe_webhooks_log')
          .update({ error: error.message })
          .eq('event_id', eventId)
      } catch (logError) {
        console.error('Failed to log error:', logError)
      }
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Handler: Checkout Session Completed
async function handleCheckoutComplete(session: Stripe.Checkout.Session, supabase: any) {
  let userId = session.metadata?.user_id
  const planTier = session.metadata?.plan_tier

  // Fallback: Get user_id from customer metadata if missing
  if (!userId && session.customer) {
    console.log('user_id not in session metadata, fetching from customer...')
    try {
      const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer
      userId = customer.metadata?.user_id || customer.metadata?.clerk_user_id
    } catch (error) {
      console.error('Error retrieving customer:', error)
    }
  }

  if (!userId) {
    console.error('No user_id found in session or customer metadata')
    return
  }

  console.log(`Checkout completed for user ${userId} (Clerk or Supabase ID), plan ${planTier}`)

  // Immediately sync subscription to reduce delay in upgrading features
  if (session.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      // Ensure plan tier metadata is present (fallback to checkout session metadata)
      if (!subscription.metadata?.plan_tier && planTier) {
        subscription.metadata = {
          ...subscription.metadata,
          plan_tier: planTier,
        }
      }

      await handleSubscriptionUpdate(subscription as Stripe.Subscription, supabase)
    } catch (error) {
      console.error('Error syncing subscription after checkout completion:', error)
    }
  }
}

// Handler: Subscription Created/Updated
async function handleSubscriptionUpdate(subscription: Stripe.Subscription, supabase: any) {
  let userId = subscription.metadata?.user_id
  const customerId = subscription.customer as string

  // Fallback: Get user_id from customer metadata if missing from subscription
  if (!userId) {
    console.log('user_id not in subscription metadata, fetching from customer...')
    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
      userId = customer.metadata?.user_id || customer.metadata?.clerk_user_id
    } catch (error) {
      console.error('Error retrieving customer:', error)
    }
  }

  if (!userId) {
    console.error('No user_id found in subscription or customer metadata')
    return
  }

  console.log(`Processing subscription for user ${userId} (Clerk or Supabase ID)`)

  const planTier = subscription.metadata?.plan_tier || 'premium'
  const priceId = subscription.items.data[0]?.price.id
  const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month'

  // Upsert subscription record
  const { error: subError } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_tier: planTier,
      billing_interval: billingInterval,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    },
    { onConflict: 'stripe_subscription_id' }
  )

  if (subError) {
    console.error('Error upserting subscription:', subError)
    throw subError
  }

  console.log(`Subscription ${subscription.id} updated for user ${userId}`)

  // Update profile with Stripe customer ID and tier
  await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      subscription_tier: planTier,
      subscription_status: subscription.status,
    })
    .eq('id', userId)

  // Send subscription confirmation email
  try {
    const { error: emailError } = await supabase.functions.invoke('send-subscription-email', {
      body: {
        user_id: userId,
        subscription_tier: planTier,
        subscription_status: subscription.status,
        billing_interval: billingInterval,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        amount: subscription.items.data[0]?.price.unit_amount || 1499,
        currency: subscription.items.data[0]?.price.currency || 'usd'
      }
    })

    if (emailError) {
      console.error('Error sending subscription email:', emailError)
    } else {
      console.log(`Subscription confirmation email sent to user ${userId}`)
    }
  } catch (emailError) {
    console.error('Error sending subscription email:', emailError)
  }
}

// Handler: Subscription Deleted
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any) {
  let userId = subscription.metadata?.user_id
  const customerId = subscription.customer as string

  // Fallback: Get user_id from customer metadata if missing
  if (!userId) {
    console.log('user_id not in subscription metadata, fetching from customer...')
    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
      userId = customer.metadata?.user_id || customer.metadata?.clerk_user_id
    } catch (error) {
      console.error('Error retrieving customer:', error)
    }
  }

  if (!userId) {
    console.error('No user_id found in subscription or customer metadata')
    return
  }

  // Update subscription status to canceled
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription to canceled:', error)
    throw error
  }

  // Downgrade user to basic tier
  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'basic',
      subscription_status: 'active',
    })
    .eq('id', userId)

  // Check if user exceeds basic tier limits (50 items)
  const { data: itemCount } = await supabase
    .from('pantry_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (itemCount && itemCount.count > 50) {
    console.log(`User ${userId} has ${itemCount.count} items, exceeding basic tier limit of 50`)
    // Note: Items are kept but filtered by RLS or frontend logic
    // We don't delete items - they can upgrade later to restore access
  }

  console.log(`Subscription ${subscription.id} deleted, user ${userId} downgraded to basic`)
}

// Handler: Payment Succeeded
async function handlePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  // Get user_id from subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.error('Subscription not found for invoice')
    return
  }

  // Log payment to payment_history
  await supabase.from('payment_history').insert({
    user_id: subscription.user_id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    stripe_invoice_id: invoice.id,
    stripe_charge_id: invoice.charge as string,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    description: invoice.description || 'Subscription payment',
    receipt_url: invoice.hosted_invoice_url,
  })

  console.log(`Payment succeeded for invoice ${invoice.id}`)
}

// Handler: Payment Failed
async function handlePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  const subscriptionId = invoice.subscription as string

  // Get user_id from subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.error('Subscription not found for failed payment')
    return
  }

  // Update subscription status to past_due
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId)

  // Log failed payment
  if (invoice.payment_intent) {
    await supabase.from('payment_history').insert({
      user_id: subscription.user_id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      description: 'Failed subscription payment',
    })
  }

  console.log(`Payment failed for invoice ${invoice.id}, subscription marked as past_due`)
}
