# Stripe Webhook Fix - Subscription Not Updating After Payment

## Problem
When a Basic user upgrades to Premium/Household Premium and completes payment via Stripe:
- Payment succeeds in Stripe
- User is redirected back to `/onboarding?success=true&session_id=...`
- BUT subscription tier remains "basic" instead of updating to "premium" or "household_premium"

## Root Cause
The Stripe webhook edge function (`stripe-webhook`) is either:
1. Not deployed to Supabase
2. Not properly handling the `checkout.session.completed` event
3. Not inserting/updating records in the `subscriptions` table correctly

## Solution Implemented

### 1. Fixed Onboarding Page (`src/pages/Onboarding/index.jsx`)
Added payment verification logic that:
- Polls the database for subscription updates after successful payment
- Retries up to 10 times (10 seconds) waiting for webhook to process
- Shows clear status messages (checking, success, error)
- Automatically redirects to dashboard when subscription is confirmed
- Provides error handling if webhook takes too long

### 2. Enhanced SubscriptionContext (`src/contexts/SubscriptionContext.jsx`)
- Extracted `loadSubscription()` as a reusable function
- Added `refreshSubscription()` method to manually reload subscription data
- Can be called from any component to force refresh subscription state

### 3. Required: Stripe Webhook Edge Function

**The webhook edge function MUST be deployed to Supabase.** Here's what it needs to do:

#### Location
`supabase/functions/stripe-webhook/index.ts`

#### Required Logic
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Extract metadata from checkout session
        const userId = session.metadata?.user_id
        const planTier = session.metadata?.plan_tier
        const billingInterval = session.metadata?.billing_interval

        if (!userId || !planTier) {
          console.error('Missing metadata in checkout session')
          break
        }

        // CRITICAL: Insert subscription record
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_price_id: session.metadata?.price_id || '',
            plan_tier: planTier,
            billing_interval: billingInterval || 'month',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })

        if (subError) {
          console.error('Error inserting subscription:', subError)
          throw subError
        }

        // The database trigger 'sync_subscription_to_profile' will automatically
        // update profiles.subscription_tier and profiles.subscription_status

        console.log(`Subscription created for user ${userId}: ${planTier}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Update subscription record
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Mark subscription as canceled
        const { error: deleteError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (deleteError) {
          console.error('Error canceling subscription:', deleteError)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        // Log payment history
        if (invoice.subscription && invoice.payment_intent) {
          const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single()

          if (subscription) {
            await supabaseAdmin.from('payment_history').insert({
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
          }
        }
        break
      }
    }

    // Log webhook event
    await supabaseAdmin.from('stripe_webhooks_log').insert({
      event_id: event.id,
      event_type: event.type,
      payload: event as any,
      processed: true,
    })

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})
```

## Critical Requirements for Webhook

### 1. Metadata Must Be Set in Checkout Session
When creating the checkout session in `create-checkout-session` edge function, ensure metadata is set:

```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    user_id: userId,           // REQUIRED
    plan_tier: planTier,        // REQUIRED (premium, household_premium)
    billing_interval: billingInterval, // month or year
    price_id: priceId,
  },
})
```

### 2. Webhook Must Be Registered in Stripe Dashboard
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. Copy webhook signing secret
5. Add to Supabase secrets: `STRIPE_WEBHOOK_SECRET`

### 3. Deploy Webhook Function
```bash
supabase functions deploy stripe-webhook
```

### 4. Set Supabase Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Testing the Fix

### 1. Check Webhook Logs in Stripe
After a test payment:
- Go to Stripe Dashboard → Developers → Webhooks
- Check recent webhook deliveries
- Verify `checkout.session.completed` event was sent
- Check if response was 200 OK

### 2. Check Supabase Database
```sql
-- Check if subscription was created
SELECT * FROM subscriptions WHERE user_id = 'USER_ID';

-- Check if profile was updated
SELECT subscription_tier, subscription_status FROM profiles WHERE id = 'USER_ID';

-- Check webhook logs
SELECT * FROM stripe_webhooks_log ORDER BY created_at DESC LIMIT 10;
```

### 3. Check Application Logs
```bash
# View edge function logs
supabase functions logs stripe-webhook
```

## Expected Flow After Fix

1. **User clicks "Upgrade" in app**
2. **App calls** `create-checkout-session` edge function
3. **User redirected** to Stripe Checkout
4. **User completes payment**
5. **Stripe sends** `checkout.session.completed` webhook
6. **Webhook edge function**:
   - Inserts record in `subscriptions` table
   - Database trigger `sync_subscription_to_profile()` fires automatically
   - Updates `profiles.subscription_tier` and `profiles.subscription_status`
7. **User redirected** to `/onboarding?success=true&session_id=...`
8. **Onboarding page**:
   - Polls database every 1 second
   - Checks if `subscription_tier` changed from "basic"
   - Shows success message when confirmed
   - Redirects to dashboard

## If Issue Persists

If subscriptions still don't update after implementing the fix:

1. **Check webhook is deployed and accessible**:
   ```bash
   curl https://<project-ref>.supabase.co/functions/v1/stripe-webhook
   ```

2. **Verify Stripe webhook is configured correctly**:
   - Endpoint URL matches deployed function
   - Webhook signing secret is correct
   - Required events are selected

3. **Check Supabase RLS policies**:
   ```sql
   -- Service role should bypass RLS, but verify triggers can execute
   SELECT * FROM pg_trigger WHERE tgname = 'sync_subscription_status';
   ```

4. **Manually test the trigger**:
   ```sql
   -- Insert a test subscription as service_role
   INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_tier, status)
   VALUES ('YOUR_USER_ID', 'cus_test', 'sub_test', 'price_test', 'premium', 'active');

   -- Check if profile was updated
   SELECT subscription_tier FROM profiles WHERE id = 'YOUR_USER_ID';
   -- Should return 'premium'
   ```

## Summary

The fix involves three components:
1. ✅ **Frontend polling** - Onboarding page now polls for subscription updates
2. ✅ **Context refresh** - SubscriptionContext can reload data on demand
3. ⚠️ **Webhook deployment** - MUST deploy and configure Stripe webhook edge function

The webhook is the critical missing piece. Without it, the `subscriptions` table never gets populated, and the profile tier never updates.
