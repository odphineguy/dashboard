# Meal Saver Dashboard - Database Schema Map

**Last Updated:** 2025-11-08
**Database:** Supabase PostgreSQL
**Authentication:** Clerk (Native Supabase Integration)
**Project URL:** https://qrkkcrkxpydosxwkdeve.supabase.co

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Table Relationships Diagram](#table-relationships-diagram)
3. [Core Tables](#core-tables)
4. [Subscription & Payment Tables](#subscription--payment-tables)
5. [Database Functions](#database-functions)
6. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
7. [Triggers](#triggers)
8. [Indexes](#indexes)
9. [Enums & Constraints](#enums--constraints)

---

## Authentication & Authorization

### Authentication System: Clerk

The application uses **Clerk** for authentication, not Supabase Auth. User IDs are TEXT format (e.g., `user_2abc123xyz`) instead of UUID.

**Key Function:**
```sql
-- Extracts Clerk user ID from JWT token
CREATE FUNCTION auth.jwt() RETURNS jsonb
-- Usage: (SELECT auth.jwt()->>'sub') returns the Clerk user ID
```

**Important Notes:**
- All `user_id` columns are TEXT type, not UUID
- RLS policies use `(SELECT auth.jwt()->>'sub')` to get current user ID
- Profiles are created via Clerk webhook, not Supabase triggers
- Service role bypasses all RLS policies for webhook operations

---

## Table Relationships Diagram

```
┌─────────────────┐
│   auth.users    │ (Clerk - External)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                         profiles                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ id (TEXT, PK) - Clerk user ID                      │    │
│  │ email (TEXT, UNIQUE)                               │    │
│  │ full_name (TEXT)                                   │    │
│  │ avatar_url (TEXT)                                  │    │
│  │ subscription_tier (TEXT) - basic|premium|household │    │
│  │ subscription_status (TEXT)                         │    │
│  │ stripe_customer_id (TEXT, UNIQUE)                  │    │
│  │ onboarding_completed (BOOLEAN)                     │    │
│  │ notification_preferences (JSONB)                   │    │
│  │ created_at, updated_at (TIMESTAMPTZ)               │    │
│  └────────────────────────────────────────────────────┘    │
└──┬──────────┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │          │
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────────┐
│pantry│  │pantry│  │storag│  │house │  │subscriptions │
│_items│  │_event│  │e_loc │  │holds │  │              │
│      │  │s     │  │ations│  │      │  └──────────────┘
└───┬──┘  └──────┘  └──────┘  └───┬──┘
    │                              │
    │    ┌─────────────────────────┘
    │    │
    ▼    ▼
┌─────────────────┐
│household_members│
└─────────────────┘
```

### Key Relationships:

1. **profiles** (parent table)
   - Referenced by: pantry_items, pantry_events, storage_locations, subscriptions, payment_history, households, household_members

2. **households**
   - Created by users (created_by → profiles.id)
   - Has many household_members
   - Has many pantry_items (shared items)

3. **pantry_items**
   - Belongs to user (user_id → profiles.id)
   - Optionally belongs to household (household_id → households.id)
   - Optionally stored in location (storage_location_id → storage_locations.id)

4. **subscriptions**
   - Belongs to user (user_id → profiles.id)
   - Syncs subscription_tier to profiles table via trigger

---

## Core Tables

### 1. profiles

**Purpose:** User profile information and subscription status
**RLS:** Enabled - Users can view/update their own profile

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,                    -- Clerk user ID (e.g., "user_2abc123xyz")
  email TEXT UNIQUE,                      -- User's email (from Clerk)
  full_name TEXT,                         -- Display name
  avatar_url TEXT,                        -- Profile picture URL
  subscription_tier TEXT DEFAULT 'basic'  -- basic | premium | household_premium
    CHECK (subscription_tier IN ('basic', 'premium', 'household_premium')),
  subscription_status TEXT DEFAULT 'active' -- active | canceled | past_due | trialing | incomplete
    CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  stripe_customer_id TEXT UNIQUE,         -- Stripe customer reference
  onboarding_completed BOOLEAN DEFAULT FALSE,
  notification_preferences JSONB,         -- Email notification settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX idx_profiles_subscription_tier_status ON profiles(subscription_tier, subscription_status);
```

**Notification Preferences Schema (JSONB):**
```json
{
  "email_daily_digest": true,
  "email_critical_alerts": true,
  "email_weekly_summary": false
}
```

---

### 2. pantry_items

**Purpose:** User's food inventory items
**RLS:** Enabled - Users can view/manage their own items and household items

```sql
CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT,                              -- e.g., "lb", "oz", "kg", "pieces"
  category TEXT,                          -- e.g., "Dairy", "Produce", "Meat"
  expiry_date DATE,                       -- Expiration date (NOT expirationDate)
  notes TEXT,
  barcode TEXT,                           -- Product barcode (if scanned)
  image_url TEXT,                         -- Product image
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pantry_items_user_id ON pantry_items(user_id);
CREATE INDEX idx_pantry_items_household_id ON pantry_items(household_id);
CREATE INDEX idx_pantry_items_storage_location_id ON pantry_items(storage_location_id);
CREATE INDEX idx_pantry_items_expiry_date ON pantry_items(expiry_date);
CREATE INDEX idx_pantry_items_category ON pantry_items(category);
```

**Important Notes:**
- `expiry_date` is stored as DATE type (use ISO format: YYYY-MM-DD)
- Personal items: `household_id` is NULL
- Shared items: `household_id` references a household
- Frontend mapping: `item.expiry_date` → `expirationDate` (camelCase)

---

### 3. pantry_events

**Purpose:** Tracks consumption and waste of pantry items
**RLS:** Enabled - Users can view/create their own events

```sql
CREATE TABLE pantry_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('consumed', 'wasted')),
  category TEXT,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pantry_events_user_id ON pantry_events(user_id);
CREATE INDEX idx_pantry_events_event_type ON pantry_events(event_type);
CREATE INDEX idx_pantry_events_event_date ON pantry_events(event_date);
CREATE INDEX idx_pantry_events_category ON pantry_events(category);
```

**Event Types:**
- `consumed`: Item was used/eaten
- `wasted`: Item expired or was thrown away

**Usage:**
- Dashboard analytics (waste reduction tracking)
- Achievement system triggers
- Weekly/monthly reports

---

### 4. storage_locations

**Purpose:** User-defined storage areas (Pantry, Fridge, Freezer, etc.)
**RLS:** Enabled - Users can manage their own locations

```sql
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                     -- e.g., "Pantry", "Refrigerator"
  location_type TEXT,                     -- pantry | fridge | freezer | custom
  icon TEXT,                              -- Emoji or icon identifier
  color TEXT,                             -- Hex color code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_storage_locations_user_id ON storage_locations(user_id);
```

**Default Locations Created on Signup:**
1. Pantry (type: 'pantry', icon: '🍞')
2. Refrigerator (type: 'fridge', icon: '❄️')
3. Freezer (type: 'freezer', icon: '🧊')

**Subscription Limits:**
- Basic: 3 storage locations (default)
- Premium: 5 storage locations
- Household Premium: Unlimited

---

### 5. households

**Purpose:** Multi-user household groups for shared inventory
**RLS:** Enabled - Users can view households they belong to

```sql
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_households_created_by ON households(created_by);
```

---

### 6. household_members

**Purpose:** Junction table linking users to households
**RLS:** Enabled - Users can view their own memberships

```sql
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(household_id, user_id)           -- One user can join a household once
);

-- Indexes
CREATE INDEX idx_household_members_household_id ON household_members(household_id);
CREATE INDEX idx_household_members_user_id ON household_members(user_id);
```

**Roles:**
- `owner`: Creator of household (full permissions)
- `admin`: Can manage members and settings
- `member`: Can view/edit shared items

---

## Subscription & Payment Tables

### 7. subscriptions

**Purpose:** Stripe subscription tracking
**RLS:** Enabled - Users can view their own subscriptions, service role can manage all

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL, -- Preserve billing history
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'premium', 'household_premium')),
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_tier ON subscriptions(plan_tier);
CREATE INDEX idx_subscriptions_active ON subscriptions(user_id, status)
  WHERE status IN ('active', 'trialing', 'past_due');
```

**Subscription Tiers:**
- `basic`: Free tier (50 items, limited features)
- `premium`: $14.99/month or $99/year (unlimited items, 3 household members)
- `household_premium`: $14.99/month or $149/year (unlimited members & locations)

**Status Values:**
- `active`: Subscription is active and paid
- `trialing`: In trial period
- `past_due`: Payment failed, grace period
- `canceled`: Canceled (may still be active until period end)
- `incomplete`: Initial payment pending
- `incomplete_expired`: Payment failed during setup
- `unpaid`: Subscription unpaid

---

### 8. payment_history

**Purpose:** Audit trail of all payments
**RLS:** Enabled - Users can view their own payment history

```sql
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL, -- Preserve audit trail
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  amount INTEGER NOT NULL,                -- Amount in cents (e.g., 1499 = $14.99)
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded', 'partially_refunded')),
  description TEXT,
  receipt_url TEXT,                       -- Stripe receipt URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_stripe_payment_intent ON payment_history(stripe_payment_intent_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at DESC);
```

---

### 9. stripe_webhooks_log

**Purpose:** Log all Stripe webhook events for debugging
**RLS:** Enabled - Service role only (no user access)

```sql
CREATE TABLE stripe_webhooks_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,          -- Stripe event ID (idempotency)
  event_type TEXT NOT NULL,               -- e.g., "checkout.session.completed"
  payload JSONB NOT NULL,                 -- Full webhook payload
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,                             -- Error message if processing failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_webhooks_event_id ON stripe_webhooks_log(event_id);
CREATE INDEX idx_webhooks_event_type ON stripe_webhooks_log(event_type);
CREATE INDEX idx_webhooks_processed ON stripe_webhooks_log(processed);
CREATE INDEX idx_webhooks_created_at ON stripe_webhooks_log(created_at DESC);
```

**Webhook Events Handled:**
- `checkout.session.completed`: New subscription created
- `customer.subscription.created`: Subscription created
- `customer.subscription.updated`: Subscription changed
- `customer.subscription.deleted`: Subscription canceled
- `invoice.payment_succeeded`: Payment successful
- `invoice.payment_failed`: Payment failed

---

## Database Functions

### 1. get_user_subscription(p_user_id TEXT)

**Purpose:** Get user's active subscription details
**Returns:** Subscription information or NULL if no active subscription

```sql
CREATE FUNCTION get_user_subscription(p_user_id TEXT)
RETURNS TABLE (
  subscription_id UUID,
  tier TEXT,
  status TEXT,
  billing_interval TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);
```

**Usage:**
```sql
SELECT * FROM get_user_subscription('user_2abc123xyz');
```

---

### 2. has_feature_access(p_user_id TEXT, p_feature TEXT)

**Purpose:** Check if user has access to a specific feature
**Returns:** BOOLEAN (true if user has access)

```sql
CREATE FUNCTION has_feature_access(p_user_id TEXT, p_feature TEXT)
RETURNS BOOLEAN;
```

**Feature Names:**
- `basic_inventory`: Basic inventory management (always true)
- `unlimited_items`: Unlimited pantry items (Premium+)
- `unlimited_scanner`: Unlimited AI scans (Premium+)
- `advanced_recipes`: Advanced recipe generation (Premium+)
- `extra_storage_locations`: More than 3 storage locations (Premium+)
- `household_members`: Household sharing (Premium+)
- `unlimited_household_members`: Unlimited members (Household Premium only)
- `advanced_analytics`: Advanced analytics (Premium+)
- `priority_support`: Priority support (Premium+)

**Usage:**
```sql
SELECT has_feature_access('user_2abc123xyz', 'unlimited_items');
```

---

### 3. get_subscription_limits(p_user_id TEXT)

**Purpose:** Get user's subscription limits
**Returns:** Table with all limits

```sql
CREATE FUNCTION get_subscription_limits(p_user_id TEXT)
RETURNS TABLE (
  max_pantry_items INTEGER,           -- NULL = unlimited
  max_scanner_per_month INTEGER,
  max_recipes_per_week INTEGER,
  max_storage_locations INTEGER,
  max_household_members INTEGER,
  has_advanced_analytics BOOLEAN,
  has_priority_support BOOLEAN
);
```

**Limit Values by Tier:**

| Feature | Basic | Premium | Household Premium |
|---------|-------|---------|-------------------|
| Pantry Items | 50 | Unlimited | Unlimited |
| Scanner Scans/Month | 10 | Unlimited | Unlimited |
| Recipes/Week | 3 | Unlimited | Unlimited |
| Storage Locations | 3 | 5 | Unlimited |
| Household Members | 1 | 3 | Unlimited |
| Advanced Analytics | No | Yes | Yes |
| Priority Support | No | Yes | Yes |

---

### 4. can_add_pantry_item(p_user_id TEXT)

**Purpose:** Check if user can add more pantry items
**Returns:** BOOLEAN (true if under limit)

```sql
CREATE FUNCTION can_add_pantry_item(p_user_id TEXT)
RETURNS BOOLEAN;
```

**Usage:**
```javascript
const { data: canAdd } = await supabase.rpc('can_add_pantry_item', {
  p_user_id: user.id
});

if (!canAdd) {
  alert('You have reached your item limit. Upgrade to Premium for unlimited items.');
}
```

---

### 5. get_stripe_customer_id(p_user_id TEXT)

**Purpose:** Get user's Stripe customer ID
**Returns:** TEXT (Stripe customer ID or NULL)

```sql
CREATE FUNCTION get_stripe_customer_id(p_user_id TEXT)
RETURNS TEXT;
```

---

### 6. update_user_subscription_tier()

**Purpose:** Update user's subscription tier (called by webhook)
**Access:** Service role only

```sql
CREATE FUNCTION update_user_subscription_tier(
  p_user_id TEXT,
  p_tier TEXT,
  p_status TEXT,
  p_stripe_customer_id TEXT
) RETURNS VOID;
```

---

## Row Level Security (RLS) Policies

All tables have RLS enabled. Policies use Clerk's native Supabase integration via `auth.jwt()`.

### Authentication Pattern

```sql
-- Get current Clerk user ID
(SELECT auth.jwt()->>'sub')

-- Service role bypass
current_setting('role', true) = 'service_role'
```

### profiles

```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ((SELECT auth.jwt()->>'sub') = id OR current_setting('role', true) = 'service_role');

-- Users can insert own profile (during onboarding)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK ((SELECT auth.jwt()->>'sub') = id OR current_setting('role', true) = 'service_role');

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((SELECT auth.jwt()->>'sub') = id OR current_setting('role', true) = 'service_role')
  WITH CHECK ((SELECT auth.jwt()->>'sub') = id OR current_setting('role', true) = 'service_role');

-- Service role can manage all profiles
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');
```

### pantry_items

```sql
-- Users can view own items OR household items
CREATE POLICY "Users can view own pantry items"
  ON pantry_items FOR SELECT
  USING (
    (SELECT auth.jwt()->>'sub') = user_id OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.jwt()->>'sub')
    ) OR
    current_setting('role', true) = 'service_role'
  );

-- Users can insert own items
CREATE POLICY "Users can insert own pantry items"
  ON pantry_items FOR INSERT
  WITH CHECK (
    (SELECT auth.jwt()->>'sub') = user_id OR
    current_setting('role', true) = 'service_role'
  );

-- Users can update own items OR household items
CREATE POLICY "Users can update own pantry items"
  ON pantry_items FOR UPDATE
  USING (
    (SELECT auth.jwt()->>'sub') = user_id OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.jwt()->>'sub')
    ) OR
    current_setting('role', true) = 'service_role'
  );

-- Users can delete own items OR household items
CREATE POLICY "Users can delete own pantry items"
  ON pantry_items FOR DELETE
  USING (
    (SELECT auth.jwt()->>'sub') = user_id OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.jwt()->>'sub')
    ) OR
    current_setting('role', true) = 'service_role'
  );
```

### storage_locations

```sql
-- Users can view own storage locations
CREATE POLICY "Users can view own locations"
  ON storage_locations FOR SELECT
  USING ((SELECT auth.jwt()->>'sub') = user_id);

-- Users can manage own storage locations
CREATE POLICY "Users can insert own locations"
  ON storage_locations FOR INSERT
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can update own locations"
  ON storage_locations FOR UPDATE
  USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can delete own locations"
  ON storage_locations FOR DELETE
  USING ((SELECT auth.jwt()->>'sub') = user_id);
```

### subscriptions

```sql
-- Users can view own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING ((SELECT auth.jwt()->>'sub') = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');
```

### payment_history

```sql
-- Users can view own payment history
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  USING ((SELECT auth.jwt()->>'sub') = user_id);

-- Service role can manage all payment history
CREATE POLICY "Service role can manage payment history"
  ON payment_history FOR ALL
  USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');
```

---

## Triggers

### 1. update_subscription_timestamp

**Table:** subscriptions
**Trigger:** BEFORE UPDATE
**Purpose:** Auto-update `updated_at` timestamp

```sql
CREATE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();
```

---

### 2. sync_subscription_to_profile

**Table:** subscriptions
**Trigger:** AFTER INSERT OR UPDATE
**Purpose:** Sync subscription data to profiles table

```sql
CREATE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    subscription_tier = NEW.plan_tier,
    subscription_status = NEW.status,
    stripe_customer_id = NEW.stripe_customer_id
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_subscription_status
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_profile();
```

**Flow:**
1. Stripe webhook updates `subscriptions` table
2. Trigger automatically updates `profiles.subscription_tier` and `subscription_status`
3. Application reads subscription from profiles (denormalized for performance)

---

## Indexes

### Performance Indexes

All tables have indexes on:
- Primary keys (automatic)
- Foreign keys (user_id, household_id, etc.)
- Frequently queried columns (status, tier, dates)
- Compound indexes for common query patterns

**Key Compound Indexes:**

```sql
-- Profiles: Fast subscription status lookups
CREATE INDEX idx_profiles_subscription_tier_status
  ON profiles(subscription_tier, subscription_status);

-- Subscriptions: Fast active subscription queries
CREATE INDEX idx_subscriptions_active
  ON subscriptions(user_id, status)
  WHERE status IN ('active', 'trialing', 'past_due');

-- Household members: Fast household lookups for RLS
CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);
```

---

## Enums & Constraints

### Subscription Tiers

```sql
CHECK (subscription_tier IN ('basic', 'premium', 'household_premium'))
```

### Subscription Status

```sql
CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'))
```

### Payment Status

```sql
CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded', 'partially_refunded'))
```

### Event Types (pantry_events)

```sql
CHECK (event_type IN ('consumed', 'wasted'))
```

### Billing Intervals

```sql
CHECK (billing_interval IN ('month', 'year'))
```

### Household Roles

```sql
CHECK (role IN ('owner', 'admin', 'member'))
```

---

## Migration History

### Migration Timeline

1. **20251011175316** - Add onboarding_completed flag to profiles
2. **20251013230000** - Create profile trigger for Supabase Auth (deprecated)
3. **20251016000000** - Add subscription system (subscriptions, payment_history, stripe_webhooks_log)
4. **20251016000001** - Add subscription functions (has_feature_access, get_subscription_limits, etc.)
5. **20251021000000** - Add default storage locations
6. **20251022000000** - Clerk compatibility (convert UUID to TEXT, update RLS policies)
7. **20251023000000** - Fix profile RLS for Clerk users
8. **20251023120000** - Switch to Clerk native integration (use auth.jwt() instead of custom function)

### Important Migration Notes

- **User ID Format Changed:** UUID → TEXT (Clerk user IDs like `user_2abc123xyz`)
- **Foreign Keys Updated:** All user_id references now point to profiles table, not auth.users
- **RLS Policies Updated:** Now use `(SELECT auth.jwt()->>'sub')` instead of `auth.uid()`
- **Profile Creation:** Moved from Supabase trigger to Clerk webhook
- **Subscription Sync:** Automated via trigger from subscriptions → profiles

---

## Data Access Patterns

### Common Queries

**Get user's pantry items:**
```javascript
const { data } = await supabase
  .from('pantry_items')
  .select(`
    *,
    storage_locations (id, name)
  `)
  .eq('user_id', user.id)
  .is('household_id', null)  // Personal items only
  .order('created_at', { ascending: false });
```

**Get household items:**
```javascript
const { data } = await supabase
  .from('pantry_items')
  .select(`
    *,
    storage_locations (id, name)
  `)
  .eq('household_id', householdId)
  .order('created_at', { ascending: false });
```

**Check subscription status:**
```javascript
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_tier, subscription_status')
  .eq('id', user.id)
  .single();

if (profile.subscription_tier === 'basic') {
  // Show upgrade prompt
}
```

**Get expiring items:**
```javascript
const threeDaysFromNow = new Date();
threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

const { data } = await supabase
  .from('pantry_items')
  .select('*')
  .eq('user_id', user.id)
  .lte('expiry_date', threeDaysFromNow.toISOString().split('T')[0])
  .order('expiry_date', { ascending: true });
```

---

## Security Best Practices

### 1. Row Level Security (RLS)

- All tables have RLS enabled
- Users can only access their own data
- Household items are accessible to all household members
- Service role bypasses RLS for webhook operations

### 2. Data Validation

- Check constraints on enums prevent invalid data
- Foreign key constraints maintain referential integrity
- UNIQUE constraints prevent duplicate records

### 3. Billing Security

- `user_id` in subscriptions/payment_history uses ON DELETE SET NULL
- Preserves billing audit trail even if user account is deleted
- Stripe customer ID is unique per user
- Webhook events are logged for debugging and auditing

### 4. Authentication

- Clerk handles all authentication
- JWTs are validated by Supabase
- No passwords stored in database
- Service role key required for admin operations

---

## Additional Tables (Inferred from Code)

Based on code references, these tables may also exist but are not in the migration files:

### ai_saved_recipes
- Purpose: User's saved AI-generated recipes
- Fields: id, user_id, recipe_data (JSONB), created_at

### user_achievements
- Purpose: User achievement tracking
- Fields: id, user_id, achievement_id, unlocked_at

### household_invitations
- Purpose: Pending household invitations
- Fields: id, household_id, invited_by, email, status

### user_integrations
- Purpose: Third-party integrations (Gmail, etc.)
- Fields: id, user_id, integration_type, credentials (encrypted)

### activity_log
- Purpose: Audit trail of user actions
- Fields: id, user_id, action_type, metadata (JSONB), created_at

**Note:** These tables are referenced in the Clerk compatibility migration but may have been created in earlier migrations not present in the repository.

---

## Support & Maintenance

**Database Provider:** Supabase
**Project Reference:** qrkkcrkxpydosxwkdeve
**Region:** US West 1

**Key Contacts:**
- Stripe webhook endpoint: `/supabase/functions/stripe-webhook`
- Email notification function: `/supabase/functions/send-email-notifications`

**Monitoring:**
- Stripe webhook logs: `stripe_webhooks_log` table
- Payment audit: `payment_history` table
- Subscription sync: Automatic via trigger

---

**End of Database Schema Map**
