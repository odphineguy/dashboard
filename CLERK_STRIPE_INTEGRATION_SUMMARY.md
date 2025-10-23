# Clerk + Stripe Integration Fix Summary

## Overview
Successfully migrated the authentication system from Supabase Auth to Clerk, and fixed Stripe payment integration to work with Clerk user IDs.

---

## Changes Completed

### 1. **Database Migration** ✅
**File:** `/supabase/migrations/20251022000000_clerk_compatibility.sql`

**Changes:**
- Created `public.clerk_user_id()` function to extract Clerk user ID from JWT tokens
- Converted all `user_id` columns from `UUID` to `TEXT` to support Clerk user IDs (format: `user_2abc123xyz`)
- Dropped and recreated ALL RLS policies to use `public.clerk_user_id()` instead of `auth.uid()`
- Updated foreign key constraints to reference `profiles(id)` instead of `auth.users(id)`
- Updated all database functions to accept `TEXT` user IDs instead of `UUID`
- Disabled Supabase auth trigger (profile creation now handled by Clerk webhook)

**Tables Updated:**
- `profiles` - Primary key changed to TEXT
- `subscriptions` - user_id changed to TEXT
- `payment_history` - user_id changed to TEXT
- `pantry_items` - user_id changed to TEXT
- `pantry_events` - user_id changed to TEXT
- `storage_locations` - user_id changed to TEXT
- `households` - created_by changed to TEXT
- `household_members` - user_id changed to TEXT
- `ai_saved_recipes` - user_id changed to TEXT
- `user_achievements` - user_id changed to TEXT
- `household_invitations` - invited_by changed to TEXT
- `user_integrations` - user_id changed to TEXT
- `activity_log` - created_by and user_id changed to TEXT

**Status:** Migration successfully applied to production database ✅

---

### 2. **Stripe Checkout Edge Function** ✅
**File:** `/supabase/functions/create-checkout-session/index.ts`

**Changes:**
- Added fallback profile creation if Clerk webhook hasn't fired yet
- When profile doesn't exist, creates it with:
  - `id`: Clerk user ID (TEXT)
  - `email`: User email
  - `full_name`: User name
  - `subscription_tier`: 'basic'
  - `subscription_status`: 'active'
- Ensures Stripe customer creation always has a valid profile to update
- Already correctly stores Clerk user ID in Stripe metadata

**Key Logic:**
```typescript
const effectiveUserId = clerkUserId || user.id  // Clerk ID takes priority
const effectiveEmail = userEmail || user.email
const effectiveName = userName || user.email?.split('@')[0]

// Fallback profile creation if not exists
if (!profile) {
  await supabaseClient.from('profiles').insert({
    id: effectiveUserId,  // Clerk user ID
    email: effectiveEmail,
    full_name: effectiveName,
    subscription_tier: 'basic',
    subscription_status: 'active',
    onboarding_completed: false,
  })
}
```

**Status:** Code updated ✅

---

### 3. **Stripe Webhook Handler** ✅
**File:** `/supabase/functions/stripe-webhook/index.ts`

**Changes:**
- Added fallback user ID extraction from Stripe customer metadata
- Updates all handler functions:
  - `handleCheckoutComplete` - Gets user ID from session or customer
  - `handleSubscriptionUpdate` - Gets user ID from subscription or customer
  - `handleSubscriptionDeleted` - Gets user ID from subscription or customer
  - `handlePaymentSucceeded` - Already uses database lookup (no changes needed)
  - `handlePaymentFailed` - Already uses database lookup (no changes needed)

**Key Logic:**
```typescript
let userId = subscription.metadata?.user_id

// Fallback: Get user_id from customer metadata
if (!userId) {
  const customer = await stripe.customers.retrieve(customerId)
  userId = customer.metadata?.user_id || customer.metadata?.clerk_user_id
}
```

**Status:** Code updated ✅

---

### 4. **Clerk Webhook Handler** ✅
**File:** `/supabase/functions/clerk-webhook/index.ts`

**Status:** Already correctly implemented!

**Functionality:**
- Handles `user.created` event → Creates profile in Supabase
- Handles `user.updated` event → Updates profile in Supabase
- Handles `user.deleted` event → Deletes profile (cascades to all related data)
- Uses Clerk user ID as primary key: `id: data.id`
- Sets default tier to 'basic' (matching migration default)

**Webhook Events:**
- `user.created` ✓
- `user.updated` ✓
- `user.deleted` ✓

**Status:** Code verified ✅

---

## Next Steps (For Deployment)

### 1. **Deploy Clerk Webhook** 🔴 REQUIRED
```bash
# Set the webhook secret
supabase secrets set CLERK_WEBHOOK_SECRET=whsec_your_clerk_webhook_secret_from_dashboard

# Deploy the function (must skip JWT verification for Clerk webhooks)
supabase functions deploy clerk-webhook --no-verify-jwt
```

**Then configure in Clerk Dashboard:**
1. Go to https://dashboard.clerk.com
2. Navigate to **Webhooks**
3. Click **Add Endpoint**
4. Enter URL: `https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/clerk-webhook`
5. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
6. Copy the **Signing Secret** and update the `CLERK_WEBHOOK_SECRET` above

---

### 2. **Deploy Updated Edge Functions** 🔴 REQUIRED
```bash
# Deploy Stripe checkout session handler
supabase functions deploy create-checkout-session

# Deploy Stripe webhook handler
supabase functions deploy stripe-webhook
```

---

### 3. **Configure Stripe Webhook** (If not already done)
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/stripe-webhook`
3. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy **Signing Secret** and set:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
   ```

---

## Testing Checklist

### Database Migration ✅
- [x] Migration applied successfully
- [x] All tables updated to TEXT user_id
- [x] RLS policies using `public.clerk_user_id()`
- [x] Database functions accept TEXT parameters

### Clerk Integration 🔴 TODO
- [ ] Clerk webhook deployed
- [ ] Clerk webhook configured in dashboard
- [ ] New Clerk user signup creates profile in database
- [ ] User can log in with Clerk and see dashboard
- [ ] User profile data visible in app

### Stripe Payment Flow 🔴 TODO
- [ ] Edge functions deployed
- [ ] Stripe webhook configured
- [ ] User can create checkout session
- [ ] Stripe customer created successfully
- [ ] Payment completes successfully
- [ ] Subscription record created in database
- [ ] Profile updated with correct tier
- [ ] User can access premium features
- [ ] Stripe webhook processes correctly
- [ ] Payment history recorded

### End-to-End Test 🔴 TODO
1. **New User Flow:**
   - [ ] Sign up with Clerk (Google OAuth)
   - [ ] Profile created automatically
   - [ ] User sees dashboard
   - [ ] User can select Premium plan
   - [ ] Checkout session created
   - [ ] Payment succeeds
   - [ ] Subscription shows "Household Premium"
   - [ ] User can add unlimited pantry items

2. **Existing User Flow:**
   - [ ] Existing user logs in with Clerk
   - [ ] Profile data migrates correctly
   - [ ] Previous data visible
   - [ ] Can upgrade/downgrade subscription

---

## Architecture Summary

### Authentication Flow
```
Clerk Sign Up → Clerk Webhook → Create Profile in Supabase
     ↓
Clerk JWT Token → public.clerk_user_id() → RLS Policies Allow Access
```

### Payment Flow
```
User Clicks "Upgrade" → create-checkout-session Edge Function
     ↓
Create/Update Profile (fallback if webhook missed)
     ↓
Create Stripe Customer (metadata: clerk_user_id)
     ↓
Create Checkout Session (metadata: clerk_user_id, plan_tier)
     ↓
User Pays → Stripe Webhook → stripe-webhook Edge Function
     ↓
Extract user_id from metadata → Upsert Subscription → Update Profile Tier
```

### Database Access
```
Frontend Request (with Clerk JWT) → Supabase
     ↓
RLS Policy checks public.clerk_user_id() = user_id
     ↓
Returns user's data
```

---

## Critical Configuration

### Clerk JWT Configuration
Ensure Clerk JWTs are configured to be validated by Supabase:

1. In Clerk Dashboard → **JWT Templates**
2. Create new template or edit existing
3. Ensure `sub` claim contains Clerk user ID
4. Copy JWKS URL
5. In Supabase Dashboard → **Authentication** → **Providers**
6. Add Clerk as JWKS provider with the URL

**Note:** The `public.clerk_user_id()` function extracts the `sub` claim from the JWT.

---

## Database Schema Changes Summary

### Before (Supabase Auth)
```sql
profiles.id UUID → references auth.users(id)
subscriptions.user_id UUID → references auth.users(id)
RLS: auth.uid() = user_id
```

### After (Clerk Auth)
```sql
profiles.id TEXT → Clerk user ID (e.g., "user_2abc123xyz")
subscriptions.user_id TEXT → references profiles(id)
RLS: public.clerk_user_id() = user_id
```

---

## Security Considerations

✅ **Implemented:**
- Webhook signature verification (both Clerk and Stripe)
- Service role properly scoped
- CORS headers configured
- RLS policies updated to use Clerk JWT

⚠️ **Notes:**
- Service role bypasses RLS (required for webhooks)
- Clerk webhook secret must be kept secure
- Stripe webhook secret must be kept secure
- Both webhooks use `--no-verify-jwt` flag (they authenticate via signatures, not JWT)

---

## Common Issues & Solutions

### Issue: "Profile not found"
**Cause:** Clerk webhook not configured or not fired yet
**Solution:**
1. Deploy Clerk webhook
2. Configure in Clerk dashboard
3. Fallback logic in `create-checkout-session` will auto-create profile

### Issue: "Subscription not syncing"
**Cause:** Stripe webhook not configured
**Solution:**
1. Deploy `stripe-webhook` function
2. Configure webhook in Stripe dashboard
3. Verify `STRIPE_WEBHOOK_SECRET` is set

### Issue: "RLS policy blocking access"
**Cause:** `public.clerk_user_id()` not extracting user ID from JWT
**Solution:**
1. Verify Clerk JWT includes `sub` claim
2. Check Supabase is configured to validate Clerk JWTs
3. Test: `SELECT public.clerk_user_id()` in SQL editor while logged in

### Issue: "Foreign key constraint violation"
**Cause:** Old code trying to use UUID for user_id
**Solution:** Migration already fixed this - redeploy frontend if issue persists

---

## Files Modified

### Database
- `/supabase/migrations/20251022000000_clerk_compatibility.sql` (NEW)

### Edge Functions
- `/supabase/functions/create-checkout-session/index.ts` (UPDATED)
- `/supabase/functions/stripe-webhook/index.ts` (UPDATED)
- `/supabase/functions/clerk-webhook/index.ts` (VERIFIED)

### Documentation
- `CLERK_STRIPE_INTEGRATION_SUMMARY.md` (NEW - this file)

---

## Deployment Commands (Quick Reference)

```bash
# 1. Database (ALREADY DONE ✅)
supabase db push

# 2. Set Secrets
supabase secrets set CLERK_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_SECRET_KEY=sk_...

# 3. Deploy Edge Functions
supabase functions deploy clerk-webhook --no-verify-jwt
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook

# 4. Verify Deployments
supabase functions list
```

---

## Support & Debugging

### View Logs
```bash
# Clerk webhook logs
supabase functions logs clerk-webhook --tail

# Stripe checkout logs
supabase functions logs create-checkout-session --tail

# Stripe webhook logs
supabase functions logs stripe-webhook --tail
```

### Test Webhooks
```bash
# Clerk - trigger by creating a test user in Clerk dashboard
# Watch logs while creating user

# Stripe - use Stripe CLI
stripe trigger checkout.session.completed
stripe listen --forward-to https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/stripe-webhook
```

---

## Success Criteria

✅ **Database Migration Complete**
🔴 **Clerk Webhook Needs Deployment**
🔴 **Stripe Edge Functions Need Deployment**
🔴 **End-to-End Payment Flow Needs Testing**

**Once all deployed and tested, the integration will be complete!**

---

## Contact for Issues

If you encounter issues during deployment or testing:

1. Check edge function logs (see "Support & Debugging" section)
2. Verify webhook secrets are set correctly
3. Test with Stripe test mode first
4. Check Clerk dashboard for webhook delivery status
5. Verify RLS policies with: `SELECT public.clerk_user_id()` in SQL editor

---

**Generated:** 2025-10-22
**Migration Status:** ✅ Applied
**Code Status:** ✅ Updated
**Deployment Status:** 🔴 Pending
