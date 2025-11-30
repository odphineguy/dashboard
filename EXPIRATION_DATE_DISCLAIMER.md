# Meal Saver: How Expiration Dates Work

## Important Disclaimer for Users

**Barcodes do not contain expiration dates.** This is a common misconception. Product barcodes (UPC/EAN codes) only identify *what* a product is—not *when* it expires. Expiration dates are printed separately on packaging and vary by manufacturing batch, storage conditions, and retail handling.

---

## How Meal Saver Estimates Expiration Dates

Since no universal database of barcode-linked expiration dates exists, Meal Saver uses **AI-powered estimation** based on food safety guidelines from the USDA and FDA.

### When You Scan a Barcode
1. AI reads the barcode and identifies the product (using OpenFoodFacts database when possible)
2. AI suggests an expiration timeframe based on the food category
3. You can adjust the date before saving

### When You Scan a Receipt
AI analyzes each food item and estimates expiration based on standard shelf life guidelines:

| Food Category | Estimated Shelf Life |
|---------------|---------------------|
| Fresh Produce | 3-7 days |
| Dairy Products | 7-14 days |
| Fresh Meat/Seafood | 1-3 days |
| Bakery Items | 2-5 days |
| Frozen Foods | 90-180 days |
| Canned Goods | 365+ days |
| Beverages (non-dairy) | 30-90 days |

### When You Add Items Manually
You enter the expiration date yourself, or leave it blank.

---

## Why AI Estimation?

There is no public database that links barcodes to real-time expiration dates because:

1. **Expiration dates are batch-specific** — The same product barcode applies to items manufactured months apart
2. **Dates vary by retailer** — How long a product sat in distribution affects freshness
3. **No standard exists** — "Best by," "Sell by," and "Use by" dates mean different things

The USDA FoodKeeper database (used as a reference) provides general storage guidelines for ~500 food types—not product-specific dates.

---

## Your Responsibility

Meal Saver's expiration estimates are **guidelines based on food safety best practices**, not guarantees. Always:

- Check actual product labels for printed dates
- Use your senses—look, smell, and assess food before consuming
- Adjust dates in the app to match your actual products
- When in doubt, throw it out

---

## Data Sources

Meal Saver references:
- **USDA FoodKeeper** — Public domain food storage guidelines
- **OpenFoodFacts** — Open-source product database (for product identification, not expiration)
- **FDA Food Safety Guidelines** — General shelf life recommendations

---

*This feature is designed to help reduce food waste by reminding you about items before they spoil. It is not a substitute for proper food safety practices.*
