# Recent Fixes - Subscription & Authentication Issues

This document summarizes all fixes implemented to resolve subscription upgrade and authentication issues.

---

## Issue #1: Subscription Not Updating After Payment ❌ → ✅

### Problem
Users completed payment via Stripe successfully, but remained on "basic" tier instead of being upgraded to "premium" or "household_premium".

### Root Cause
Stripe webhook edge functions were missing or not deployed, so subscription updates never reached the database.

### Solution
1. ✅ Created all Stripe edge functions
2. ✅ Fixed onboarding page to poll for subscription updates
3. ✅ Added `refreshSubscription()` method to SubscriptionContext
4. ✅ Created comprehensive deployment documentation

### Files Modified
- `src/pages/Onboarding/index.jsx` - Added payment verification with polling
- `src/contexts/SubscriptionContext.jsx` - Added refresh method
- `supabase/functions/stripe-webhook/index.ts` - Created webhook handler
- `supabase/functions/create-checkout-session/index.ts` - Created checkout handler
- `supabase/functions/create-customer-portal-session/index.ts` - Created portal handler
- `supabase/functions/cancel-subscription/index.ts` - Created cancellation handler

### Documentation Created
- `STRIPE_WEBHOOK_FIX.md` - Technical explanation
- `DEPLOYMENT_GUIDE.md` - Step-by-step deployment instructions

### Next Steps
**YOU MUST DO THIS:**
1. Deploy edge functions to Supabase
2. Configure Stripe webhook endpoint
3. Set Supabase secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)

See `DEPLOYMENT_GUIDE.md` for complete instructions.

---

## Issue #2: Stuck Loading After Google Sign-In ❌ → ✅

### Problem
After deploying edge functions, Google OAuth sign-in got stuck on loading screen with 406 errors and "PGRST116" database errors.

### Root Cause
1. Clerk JWT wasn't configured with Supabase template
2. New Clerk users didn't get Supabase profiles auto-created
3. SubscriptionContext used `.single()` which threw errors on missing profiles

### Solution
1. ✅ Updated `useSupabase.js` to request Supabase JWT template
2. ✅ Added auto-profile creation in AuthContext
3. ✅ Changed `.single()` to `.maybeSingle()` in SubscriptionContext
4. ✅ Added comprehensive error handling and logging

### Files Modified
- `src/hooks/useSupabase.js` - Added `{ template: 'supabase' }` to getToken()
- `src/contexts/AuthContext.jsx` - Added profile sync mechanism
- `src/contexts/SubscriptionContext.jsx` - Changed to maybeSingle()

### Documentation Created
- `CLERK_SETUP.md` - Clerk JWT template configuration guide
- `AUTH_FIX_SUMMARY.md` - Authentication fix summary

### Next Steps
**YOU MUST DO THIS:**
1. Create Supabase JWT template in Clerk Dashboard
2. Name it exactly `supabase` (lowercase)
3. Test Google sign-in flow

See `CLERK_SETUP.md` for complete instructions.

---

## Quick Start Guide

### For Subscription Fix:

```bash
# 1. Set Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# 2. Deploy edge functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-customer-portal-session
supabase functions deploy cancel-subscription

# 3. Configure Stripe webhook
# URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
# Events: checkout.session.completed, customer.subscription.*, invoice.payment_*
```

### For Authentication Fix:

1. **Clerk Dashboard** → JWT Templates → New Template → Supabase
2. Name: `supabase`
3. Save
4. Hard refresh app (Cmd+Shift+R)

---

## Testing Checklist

### Test Subscription Upgrade
- [ ] User clicks "Upgrade to Premium"
- [ ] Redirects to Stripe Checkout
- [ ] Complete payment with test card: `4242 4242 4242 4242`
- [ ] Redirects back to `/onboarding?success=true`
- [ ] Shows "Verifying Payment" → "Payment Successful!"
- [ ] Redirects to dashboard
- [ ] Check Supabase: `SELECT subscription_tier FROM profiles WHERE id = 'USER_ID';`
- [ ] Should show `premium` or `household_premium`

### Test Google Sign-In
- [ ] Sign out completely
- [ ] Click "Sign in with Google"
- [ ] Complete Google OAuth
- [ ] Check console: Should see "✅ Profile created successfully"
- [ ] Redirects to dashboard
- [ ] No 406 errors in console
- [ ] Check Supabase: `SELECT * FROM profiles WHERE id LIKE 'user_%';`
- [ ] Profile should exist with basic tier

---

## File Structure

```
dashboard/
├── src/
│   ├── contexts/
│   │   ├── AuthContext.jsx           ✅ Auto-creates profiles
│   │   └── SubscriptionContext.jsx   ✅ Handles missing profiles, refresh method
│   ├── hooks/
│   │   └── useSupabase.js            ✅ Uses Supabase JWT template
│   └── pages/
│       └── Onboarding/
│           └── index.jsx              ✅ Polls for subscription updates
├── supabase/
│   └── functions/
│       ├── stripe-webhook/            ✅ NEW - Handles Stripe events
│       ├── create-checkout-session/   ✅ NEW - Creates Stripe checkout
│       ├── create-customer-portal-session/ ✅ NEW - Opens billing portal
│       └── cancel-subscription/       ✅ NEW - Cancels subscriptions
└── docs/
    ├── STRIPE_WEBHOOK_FIX.md         📄 Technical explanation
    ├── DEPLOYMENT_GUIDE.md            📄 Deployment steps
    ├── CLERK_SETUP.md                 📄 Clerk configuration
    ├── AUTH_FIX_SUMMARY.md            📄 Auth fix summary
    └── FIXES_README.md                📄 This file
```

---

## Common Issues & Solutions

### "Invalid JWT template name"
**Solution:** Create `supabase` template in Clerk Dashboard

### "406 Not Acceptable" on profiles
**Solution:**
1. Check Clerk JWT template exists
2. Hard refresh browser
3. Verify token has `sub` claim: `await window.Clerk.session.getToken({ template: 'supabase' })`

### Subscription tier not updating after payment
**Solution:**
1. Check webhook is deployed: `supabase functions list`
2. Check Stripe webhook endpoint is configured
3. Check webhook logs: `supabase functions logs stripe-webhook`
4. Check database: `SELECT * FROM stripe_webhooks_log ORDER BY created_at DESC LIMIT 10;`

### Profile not created for new Clerk user
**Quick fix:**
```sql
INSERT INTO profiles (id, email, full_name, subscription_tier, subscription_status)
VALUES ('user_YOUR_CLERK_ID', 'your@email.com', 'Your Name', 'basic', 'active');
```

---

## Documentation Index

| File | Purpose | When to Use |
|------|---------|-------------|
| `DEPLOYMENT_GUIDE.md` | Deploy Stripe edge functions | Setting up subscription payments |
| `STRIPE_WEBHOOK_FIX.md` | Technical details of webhook implementation | Understanding how webhooks work |
| `CLERK_SETUP.md` | Configure Clerk JWT templates | Fixing authentication issues |
| `AUTH_FIX_SUMMARY.md` | Summary of auth fixes | Understanding auth flow |
| `FIXES_README.md` | Overview of all fixes | Starting point (this file) |

---

## Support

If issues persist after following these guides:

1. **Check edge function logs:**
   ```bash
   supabase functions logs stripe-webhook --limit 50
   ```

2. **Check database:**
   ```sql
   SELECT * FROM stripe_webhooks_log WHERE processed = false;
   SELECT * FROM profiles WHERE id LIKE 'user_%';
   SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 10;
   ```

3. **Check browser console:**
   - Look for "Failed to get Clerk token" errors
   - Check if profile creation succeeded
   - Verify subscription loaded correctly

4. **Test JWT token:**
   ```javascript
   const token = await window.Clerk.session.getToken({ template: 'supabase' })
   const payload = JSON.parse(atob(token.split('.')[1]))
   console.log('Token payload:', payload)
   ```

---

## Summary

Two major issues have been fixed:

1. **Subscription Upgrade** ✅
   - Edge functions created
   - Webhook handling implemented
   - Database triggers verified
   - Deployment guide created

2. **Authentication** ✅
   - Auto-profile creation implemented
   - JWT template configuration documented
   - Error handling improved
   - Graceful fallbacks added

**Both fixes require configuration:**
- Subscription: Deploy edge functions + configure Stripe webhook
- Authentication: Create Clerk JWT template named `supabase`

Follow the respective guides in `DEPLOYMENT_GUIDE.md` and `CLERK_SETUP.md`.
