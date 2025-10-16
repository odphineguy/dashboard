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

### Premium Monthly
- **Price ID**: `price_1SIuGJIqliEA9UotDyzveUhI`
- **Amount**: $14.99/month ($1499 cents)
- **Type**: Recurring (monthly)
- **Product**: Meal Saver Premium

### Premium Yearly
- **Price ID**: `price_1SIuGNIqliEA9UotGD93WZdc`
- **Amount**: $99/year ($9900 cents)
- **Type**: Recurring (yearly)
- **Product**: Meal Saver Premium
- **Savings**: ~$80/year (2 months free)

### Household Premium Monthly
- **Price ID**: `price_1SIuGPIqliEA9UotfLjoddkj`
- **Amount**: $14.99/month ($1499 cents)
- **Type**: Recurring (monthly)
- **Product**: Meal Saver Household Premium

### Household Premium Yearly
- **Price ID**: `price_1SIuGSIqliEA9UotuHlR3qoH`
- **Amount**: $149/year ($14900 cents)
- **Type**: Recurring (yearly)
- **Product**: Meal Saver Household Premium
- **Savings**: ~$30/year (2 months free)

---

## Usage in Code

Add these as environment variables or use directly in edge functions:

```bash
# .env.local (for reference only - use in edge functions)
STRIPE_PRICE_PREMIUM_MONTHLY=price_1SIuGJIqliEA9UotDyzveUhI
STRIPE_PRICE_PREMIUM_YEARLY=price_1SIuGNIqliEA9UotGD93WZdc
STRIPE_PRICE_HOUSEHOLD_MONTHLY=price_1SIuGPIqliEA9UotfLjoddkj
STRIPE_PRICE_HOUSEHOLD_YEARLY=price_1SIuGSIqliEA9UotuHlR3qoH
```

## Price Mapping

```javascript
const PRICE_IDS = {
  premium: {
    monthly: 'price_1SIuGJIqliEA9UotDyzveUhI',
    yearly: 'price_1SIuGNIqliEA9UotGD93WZdc'
  },
  household_premium: {
    monthly: 'price_1SIuGPIqliEA9UotfLjoddkj',
    yearly: 'price_1SIuGSIqliEA9UotuHlR3qoH'
  }
}
```

---

**Note**: These are TEST mode price IDs. When ready for production, create corresponding LIVE mode products/prices and update these IDs.
