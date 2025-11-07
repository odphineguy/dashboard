# Stripe Product & Price IDs

## Products

### Meal Saver Premium
- **Product ID**: `prod_TFP3we7PBUdvwS`
- **Description**: Advanced features for power users
- **Features**: Unlimited pantry items, unlimited AI scanner, advanced recipe generation, up to 3 household members, priority support

### Meal Saver Household Premium
- **Product ID**: `prod_TFP4qAg9zTAa1D`
- **Description**: Perfect for families and shared households
- **Features**: Everything in Premium plus unlimited household members, unlimited storage locations, shared inventory management, family meal planning, household analytics

---

## Prices

**Note**: These prices match the Pricing page (`src/pages/Pricing/index.jsx`) which is the single source of truth.

### Premium Monthly
- **Price ID**: `price_1SOSNiIWZQ4LZaTjtxDaAhDe`
- **Amount**: $9.99/month ($999 cents)
- **Type**: Recurring (monthly)
- **Product**: Meal Saver Premium
- **⚠️ ACTION REQUIRED**: Update this price ID in Stripe dashboard to charge $9.99/month

### Premium Yearly
- **Price ID**: `price_1SOSLDIWZQ4LZaTju4d1x4Kl`
- **Amount**: $99.99/year ($9999 cents)
- **Type**: Recurring (yearly)
- **Product**: Meal Saver Premium
- **Savings**: $19.89/year (2 months free)
- **⚠️ ACTION REQUIRED**: Update this price ID in Stripe dashboard to charge $99.99/year

### Household Premium Monthly
- **Price ID**: `price_1SOSMNIWZQ4LZaTjUFica6uR`
- **Amount**: $14.99/month ($1499 cents)
- **Type**: Recurring (monthly)
- **Product**: Meal Saver Household Premium
- **✅ CORRECT**: This matches Pricing page

### Household Premium Yearly
- **Price ID**: `price_1SOSMzIWZQ4LZaTjv77IRyqJ`
- **Amount**: $149.99/year ($14999 cents)
- **Type**: Recurring (yearly)
- **Product**: Meal Saver Household Premium
- **Savings**: $29.89/year (2 months free)
- **⚠️ ACTION REQUIRED**: Update this price ID in Stripe dashboard to charge $149.99/year

---

## Usage in Code

Add these as environment variables or use directly in edge functions:

```bash
# .env.local (for reference only - use in edge functions)
STRIPE_PRICE_PREMIUM_MONTHLY=price_1SOSNiIWZQ4LZaTjtxDaAhDe
STRIPE_PRICE_PREMIUM_YEARLY=price_1SOSLDIWZQ4LZaTju4d1x4Kl
STRIPE_PRICE_HOUSEHOLD_MONTHLY=price_1SOSMNIWZQ4LZaTjUFica6uR
STRIPE_PRICE_HOUSEHOLD_YEARLY=price_1SOSMzIWZQ4LZaTjv77IRyqJ
```

## Price Mapping

```javascript
const PRICE_IDS = {
  premium: {
    monthly: 'price_1SOSNiIWZQ4LZaTjtxDaAhDe',
    yearly: 'price_1SOSLDIWZQ4LZaTju4d1x4Kl'
  },
  household_premium: {
    monthly: 'price_1SOSMNIWZQ4LZaTjUFica6uR',
    yearly: 'price_1SOSMzIWZQ4LZaTjv77IRyqJ'
  }
}
```

---

**Note**: These are TEST mode price IDs. When ready for production, create corresponding LIVE mode products/prices and update these IDs.
