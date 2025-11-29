# Stripe Product & Price IDs (Sandbox/Test Mode)

## Products

### Meal Saver Premium
- **Product ID**: `prod_TFP3we7PBUdvwS`
- **Description**: Premium subscription for power users

### Meal Saver Household Premium
- **Product ID**: `prod_TFP4qAg9zTAa1D`
- **Description**: Household subscription for families

---

## Prices

### Premium Monthly
- **Price ID**: `price_1SKiIoIqliEA9Uot0fgA3c8M`
- **Amount**: $9.99/month
- **Type**: Recurring (monthly)
- **Product**: Meal Saver Premium

### Premium Yearly
- **Price ID**: `price_1SIuGNIqliEA9UotGD93WZdc`
- **Amount**: $99.00/year
- **Type**: Recurring (yearly)
- **Product**: Meal Saver Premium
- **Savings**: ~$20/year (2 months free)

### Household Premium Monthly
- **Price ID**: `price_1SIuGPIqliEA9UotfLjoddkj`
- **Amount**: $14.99/month
- **Type**: Recurring (monthly)
- **Product**: Meal Saver Household Premium

### Household Premium Yearly
- **Price ID**: `price_1SIuGSIqliEA9UotuHlR3qoH`
- **Amount**: $149.00/year
- **Type**: Recurring (yearly)
- **Product**: Meal Saver Household Premium
- **Savings**: ~$31/year (2 months free)

---

## Price Mapping (Copy-Paste Ready)

```javascript
const PRICE_IDS = {
  premium: {
    month: 'price_1SKiIoIqliEA9Uot0fgA3c8M',
    year: 'price_1SIuGNIqliEA9UotGD93WZdc'
  },
  household_premium: {
    month: 'price_1SIuGPIqliEA9UotfLjoddkj',
    year: 'price_1SIuGSIqliEA9UotuHlR3qoH'
  }
}
```

---

## Usage in Code

These price IDs are used in:
- `src/pages/Profile/components/SubscriptionManagement.jsx`
- `src/contexts/SubscriptionContext.jsx`

---

## Stripe Account Info

**Mode**: Sandbox/Test  
**Account Suffix**: `IqliEA9Uot`

**Note**: When moving to production, you'll need to:
1. Create products/prices in LIVE mode Stripe
2. Update the `STRIPE_SECRET_KEY` in Supabase to use the live key
3. Update these price IDs to the live mode versions
