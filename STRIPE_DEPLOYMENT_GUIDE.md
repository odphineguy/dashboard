# Stripe Integration Deployment Guide

## Prerequisites

1. Stripe Test Account (already configured)
2. Supabase Project (already configured)
3. Supabase CLI installed: `brew install supabase/tap/supabase`

---

## Step 1: Run Database Migrations

Apply the subscription system migrations to your Supabase database:

```bash
# Login to Supabase (if not already)
supabase login

# Link to your project
supabase link --project-ref qrkkcrkxpydosxwkdeve

# Push migrations
supabase db push
```

This will create:
- `subscriptions` table
- `payment_history` table
- `stripe_webhooks_log` table
- Add columns to `profiles` table
- Create database functions and triggers

---

## Step 2: Set Supabase Secrets

Add Stripe keys as secrets in Supabase:

```bash
# Set Stripe secret key (replace with your actual key)
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE

# Set webhook secret (get this after creating webhook endpoint in Step 4)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

---

## Step 3: Deploy Edge Functions

Deploy all 4 edge functions:

```bash
# Deploy create-checkout-session
supabase functions deploy create-checkout-session

# Deploy stripe-webhook
supabase functions deploy stripe-webhook

# Deploy create-customer-portal-session
supabase functions deploy create-customer-portal-session

# Deploy cancel-subscription
supabase functions deploy cancel-subscription
```

**Note the URLs** - they will be in format:
```
https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/FUNCTION_NAME
```

---

## Step 4: Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/stripe-webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. **Copy the signing secret** (starts with `whsec_`)
7. Set it in Supabase: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Step 5: Test Webhook Locally (Optional)

For local testing with Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local Supabase function
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# This will give you a webhook signing secret for local testing
# Use it in your local .env: STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Step 6: Update Frontend Environment Variables

Your `.env` file already has the Stripe public key. Verify it's correct:

```bash
# .env (already added)
VITE_STRIPE_PUBLIC_KEY=pk_test_YOUR_STRIPE_PUBLIC_KEY_HERE
```

---

## Step 7: Test the Integration

### Test Checkout Flow

1. Start dev server: `npm run dev`
2. Go to onboarding: `http://localhost:5173/onboarding`
3. Select Premium or Household Premium plan
4. Complete steps until payment (Step 6)
5. Use Stripe test card: `4242 4242 4242 4242`
6. Verify subscription created in Supabase

### Check Database

```sql
-- Check subscriptions
SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';

-- Check payment history
SELECT * FROM payment_history WHERE user_id = 'YOUR_USER_ID';

-- Check webhook logs
SELECT * FROM stripe_webhooks_log ORDER BY created_at DESC LIMIT 10;

-- Check profile subscription tier
SELECT subscription_tier, subscription_status, stripe_customer_id
FROM profiles WHERE id = 'YOUR_USER_ID';
```

---

## Step 8: Configure Stripe Customer Portal

1. Go to Stripe Dashboard → Settings → Customer Portal
2. Enable Customer Portal
3. Configure settings:
   - **Allow customers to update payment methods**: ✅
   - **Allow customers to update subscriptions**: ✅
   - **Allow customers to cancel subscriptions**: ✅
   - **Cancellation behavior**: "Cancel at end of billing period"
4. Save settings

---

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint is active in Stripe Dashboard
2. Verify signing secret is set correctly: `supabase secrets list`
3. Check edge function logs: `supabase functions logs stripe-webhook`
4. Check `stripe_webhooks_log` table for errors

### Subscription Not Created

1. Check `stripe_webhooks_log` for event processing
2. Verify user_id is in subscription metadata
3. Check edge function logs for errors
4. Ensure migrations ran successfully

### Payment Fails

1. Verify Stripe public key is correct in `.env`
2. Check browser console for errors
3. Use Stripe test card: `4242 4242 4242 4242`
4. Check Stripe Dashboard → Payments for error details

---

## Production Deployment

When ready for production:

1. **Create Live Stripe Products**:
   - Create products in Live mode (not Test mode)
   - Update `STRIPE_PRICE_IDS.md` with live price IDs

2. **Update Environment Variables**:
   ```bash
   # Production .env
   VITE_STRIPE_PUBLIC_KEY=pk_live_...

   # Supabase secrets
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   ```

3. **Create Production Webhook**:
   - Use same URL but with live mode webhook secret
   - Test thoroughly before going live

4. **Enable Stripe Tax** (optional):
   - Go to Stripe Dashboard → Settings → Tax
   - Enable automatic tax calculation

---

## Monitoring

### Key Metrics to Monitor

1. **Subscription Events**: Check `stripe_webhooks_log` regularly
2. **Failed Payments**: Query `payment_history` for status = 'failed'
3. **Subscription Status**: Monitor users in 'past_due' status
4. **Edge Function Errors**: `supabase functions logs`

### Alerts to Set Up

1. Webhook processing failures
2. Payment failures
3. High cancellation rates
4. Edge function errors

---

## Quick Reference

### Edge Function URLs

```
Checkout: https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/create-checkout-session
Webhook: https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/stripe-webhook
Portal: https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/create-customer-portal-session
Cancel: https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/cancel-subscription
```

### Stripe Price IDs

See `STRIPE_PRICE_IDS.md` for complete list.

---

**Deployment Complete!** 🎉

Your Stripe integration is now ready for testing.
