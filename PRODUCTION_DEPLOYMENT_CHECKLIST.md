# Production Deployment Checklist

This file contains critical steps that MUST be completed before deploying to production.

## ⚠️ CRITICAL: Update Stripe Price IDs

**Location:** `src/pages/Onboarding/index.jsx` (lines ~324-334)

The code currently uses **TEST MODE** Stripe price IDs. Before going live, you MUST update these to your **PRODUCTION** price IDs.

### Current Test Mode Price IDs (DO NOT USE IN PRODUCTION):
```javascript
const PRICE_IDS = {
  premium: {
    month: 'price_1SKiIoIqliEA9Uot0fgA3c8M', // $9.99/month
    year: 'price_1SIuGNIqliEA9UotGD93WZdc'   // $99.00/year
  },
  household_premium: {
    month: 'price_1SIuGPIqliEA9UotfLjoddkj', // $14.99/month
    year: 'price_1SIuGSIqliEA9UotuHlR3qoH'   // $149.00/year
  }
}
```

### Production Prices You Created:
According to your Stripe Dashboard screenshot from 2025-10-21, you have:
- ✅ Premium Subscription: $9.99 USD per month
- ✅ Annual Premium Subscription: $99.99 USD per year
- ✅ Premium Household Subscription: $14.99 USD per month
- ✅ Annual Premium Household Subscription: $149.99 USD per year

### Steps to Update for Production:

1. **Get Production Price IDs:**
   - Go to Stripe Dashboard (LIVE MODE - toggle off Test Mode)
   - Navigate to Products → Click each product
   - Copy the price ID for each (format: `price_xxxxx`)

2. **Update the Code:**
   - Open `src/pages/Onboarding/index.jsx`
   - Find the `PRICE_IDS` constant (around line 324)
   - Replace ALL FOUR price IDs with your production IDs
   - Example:
   ```javascript
   const PRICE_IDS = {
     premium: {
       month: 'price_PROD_PREMIUM_MONTHLY_ID_HERE',
       year: 'price_PROD_PREMIUM_YEARLY_ID_HERE'
     },
     household_premium: {
       month: 'price_PROD_HOUSEHOLD_MONTHLY_ID_HERE',
       year: 'price_PROD_HOUSEHOLD_YEARLY_ID_HERE'
     }
   }
   ```

3. **Update Environment Variables:**
   - Update `.env` with production Stripe keys:
   ```bash
   VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx  # Your live publishable key
   ```
   - Update Supabase secrets for Edge Functions:
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxx  # Your live secret key
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Your live webhook signing secret
   ```

4. **Verify Pricing:**
   - Test the onboarding flow in staging with production Stripe test mode
   - Confirm correct prices show at checkout
   - Verify Stripe Checkout shows $9.99/month for Premium, not $14.99

5. **Deploy:**
   - Commit changes
   - Deploy to production
   - Test signup flow one more time

## Other Pre-Production Tasks

- [ ] Update Stripe API keys in `.env` (test → live)
- [ ] Update Stripe price IDs in code
- [ ] Test payment flow end-to-end in Stripe test mode
- [ ] Configure Stripe webhooks for production URL
- [ ] Update Supabase Edge Function secrets
- [ ] Test email notifications in production
- [ ] Verify subscription webhooks are working
- [ ] Test OAuth redirects (Google/Apple) with production URLs
- [ ] Update CORS settings in Supabase for production domain
- [ ] Set up production monitoring/error tracking

## Notes

- Test mode prices end in `9900` and `14900` (in cents)
- Production prices should end in `9999` and `14999` (in cents) per your dashboard
- The yearly Premium price difference: Test has $99.00, Production should be $99.99
- The yearly Household Premium difference: Test has $149.00, Production should be $149.99
