# Stripe Subscription Fix - Deployment Guide

## Overview
This guide will walk you through deploying the Stripe webhook edge functions to fix the subscription upgrade issue.

## Problem Summary
- Users complete payment via Stripe successfully
- Payment shows as successful in Stripe Dashboard
- BUT user's subscription tier remains "basic" in the app
- Premium features are not unlocked

## Solution
Deploy Stripe edge functions and configure webhooks to automatically update user subscriptions after successful payment.

---

## Prerequisites

1. **Supabase CLI** installed
   ```bash
   npm install -g supabase
   ```

2. **Supabase project linked**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Stripe account** with API keys

---

## Step 1: Set Supabase Secrets

You need to add your Stripe API keys as Supabase secrets (environment variables for Edge Functions):

```bash
# Set Stripe secret key (found in Stripe Dashboard → Developers → API keys)
supabase secrets set STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for test mode

# We'll set the webhook secret in Step 3 after creating the webhook endpoint
```

To verify secrets are set:
```bash
supabase secrets list
```

---

## Step 2: Deploy Edge Functions

Deploy all four edge functions:

```bash
# Deploy webhook handler (most important!)
supabase functions deploy stripe-webhook

# Deploy checkout session creator
supabase functions deploy create-checkout-session

# Deploy customer portal (for subscription management)
supabase functions deploy create-customer-portal-session

# Deploy subscription cancellation
supabase functions deploy cancel-subscription
```

After deployment, note the function URLs. They will be in this format:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-checkout-session
```

---

## Step 3: Configure Stripe Webhook

### 3.1 Create Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed` ✅ **(CRITICAL)**
   - `customer.subscription.created` ✅
   - `customer.subscription.updated` ✅
   - `customer.subscription.deleted` ✅
   - `invoice.payment_succeeded` ✅
   - `invoice.payment_failed` ✅
5. Click **"Add endpoint"**

### 3.2 Get Webhook Signing Secret

After creating the webhook:
1. Click on the newly created endpoint
2. Click **"Reveal"** under **Signing secret**
3. Copy the secret (starts with `whsec_...`)

### 3.3 Add Webhook Secret to Supabase

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3.4 Redeploy Webhook Function

After adding the secret, redeploy the webhook function:
```bash
supabase functions deploy stripe-webhook
```

---

## Step 4: Test the Integration

### 4.1 Test Webhook Endpoint

Send a test webhook from Stripe Dashboard:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select `checkout.session.completed`
5. Click **"Send test webhook"**

Check if it returns **200 OK**. If not, check logs:
```bash
supabase functions logs stripe-webhook --limit 50
```

### 4.2 Test Full Payment Flow

1. **Start in test mode** (use Stripe test keys)
2. In your app, click **"Upgrade to Premium"**
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. You should be redirected to `/onboarding?success=true&session_id=...`
6. The onboarding page should show:
   - "Verifying Your Payment" (spinner)
   - "Payment Successful!" (checkmark)
   - Then redirect to dashboard

### 4.3 Verify Database Updates

Check your Supabase database:

```sql
-- Check if subscription was created
SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';

-- Check if profile was updated
SELECT subscription_tier, subscription_status
FROM profiles
WHERE id = 'YOUR_USER_ID';
-- Should show tier = 'premium' and status = 'active'

-- Check webhook logs
SELECT event_type, processed, error
FROM stripe_webhooks_log
ORDER BY created_at DESC
LIMIT 10;
```

---

## Step 5: Go Live (Production)

Once testing is successful:

### 5.1 Update to Live Stripe Keys

```bash
# Set live Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_live_...

# Redeploy functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-customer-portal-session
supabase functions deploy cancel-subscription
```

### 5.2 Create Live Webhook in Stripe

1. Switch to **Live mode** in Stripe Dashboard
2. Go to Developers → Webhooks
3. Add endpoint (same URL, same events)
4. Get the **live webhook signing secret** (different from test!)
5. Update secret:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... # LIVE secret
   ```
6. Redeploy:
   ```bash
   supabase functions deploy stripe-webhook
   ```

---

## Troubleshooting

### Issue: Webhook returns 400 Bad Request

**Possible causes:**
- Webhook signing secret is incorrect
- Edge function not deployed
- CORS issues

**Solutions:**
```bash
# Check function logs
supabase functions logs stripe-webhook --limit 50

# Verify secrets are set
supabase secrets list

# Redeploy function
supabase functions deploy stripe-webhook
```

### Issue: Subscription tier not updating

**Possible causes:**
- Webhook not firing
- Database trigger not executing
- Metadata not being passed correctly

**Solutions:**
```sql
-- Check webhook logs
SELECT * FROM stripe_webhooks_log
WHERE event_type = 'checkout.session.completed'
ORDER BY created_at DESC LIMIT 5;

-- Check if subscription record exists
SELECT * FROM subscriptions WHERE user_id = 'USER_ID';

-- Manually test trigger
INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_tier, status)
VALUES ('YOUR_USER_ID', 'cus_test', 'sub_test', 'price_test', 'premium', 'active');

-- Check if profile was updated
SELECT subscription_tier FROM profiles WHERE id = 'YOUR_USER_ID';
```

### Issue: Onboarding page shows "Verification taking longer than expected"

**Possible causes:**
- Webhook hasn't fired yet (can take 5-10 seconds)
- Webhook failed to process
- Database trigger didn't execute

**Solutions:**
1. Check Stripe Dashboard → Webhooks → Click endpoint → Recent events
2. Look for `checkout.session.completed` event
3. Check if response was 200 OK
4. If failed, check error message
5. Check Supabase logs:
   ```bash
   supabase functions logs stripe-webhook
   ```

### Issue: Payment succeeds but webhook never fires

**Possible causes:**
- Webhook endpoint URL is wrong
- Webhook endpoint is not accessible
- Stripe can't reach your Supabase project

**Solutions:**
1. Verify webhook URL is correct (match your project ref)
2. Test endpoint manually:
   ```bash
   curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```
3. Check if endpoint is publicly accessible
4. Re-create webhook endpoint in Stripe Dashboard

---

## Monitoring

### Check Edge Function Logs
```bash
# View recent logs
supabase functions logs stripe-webhook --limit 50

# Follow logs in real-time
supabase functions logs stripe-webhook --tail
```

### Check Database Logs
```sql
-- Recent webhook events
SELECT
  event_type,
  processed,
  error,
  created_at
FROM stripe_webhooks_log
ORDER BY created_at DESC
LIMIT 20;

-- Failed webhooks
SELECT * FROM stripe_webhooks_log
WHERE processed = false
ORDER BY created_at DESC;

-- Recent subscriptions
SELECT
  user_id,
  plan_tier,
  status,
  created_at
FROM subscriptions
ORDER BY created_at DESC
LIMIT 10;
```

---

## Summary Checklist

Before marking this as complete, verify:

- [ ] Supabase CLI installed and project linked
- [ ] Stripe secret key added to Supabase secrets
- [ ] All 4 edge functions deployed
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook signing secret added to Supabase secrets
- [ ] Webhook function redeployed after adding secret
- [ ] Test webhook sent from Stripe (returns 200 OK)
- [ ] Test payment flow completed successfully
- [ ] Database shows subscription record and updated profile
- [ ] Onboarding page verifies payment and redirects
- [ ] Production webhook created (if going live)
- [ ] Live Stripe keys configured (if going live)

---

## Quick Commands Reference

```bash
# Link Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Deploy all functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-customer-portal-session
supabase functions deploy cancel-subscription

# View logs
supabase functions logs stripe-webhook --limit 50
supabase functions logs stripe-webhook --tail

# List secrets
supabase secrets list
```

---

## Support

If you continue experiencing issues after following this guide:

1. Check Stripe Dashboard → Developers → Webhooks → Events
2. Check Supabase logs: `supabase functions logs stripe-webhook`
3. Check database: `SELECT * FROM stripe_webhooks_log WHERE processed = false;`
4. Verify secrets: `supabase secrets list`

The fix is complete when:
- ✅ User completes payment in Stripe
- ✅ Webhook fires and returns 200 OK
- ✅ Subscription record created in database
- ✅ Profile tier updated to premium/household_premium
- ✅ Onboarding page shows success and redirects
- ✅ User has access to premium features
