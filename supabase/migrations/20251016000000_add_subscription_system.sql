-- =====================================================
-- Meal Saver Subscription System Migration
-- Description: Adds Stripe subscription tracking tables
-- Date: 2025-10-16
-- =====================================================

-- 1. CREATE SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('free', 'premium', 'household_premium')),
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

-- Create indexes for subscriptions table
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_tier ON subscriptions(plan_tier);

-- Add RLS policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhook handlers)
-- No insert/update/delete policies for regular users


-- 2. CREATE PAYMENT HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  amount INTEGER NOT NULL, -- amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded', 'partially_refunded')),
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for payment_history table
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_payment_intent ON payment_history(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);

-- Add RLS policies for payment_history
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment history
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);


-- 3. CREATE STRIPE WEBHOOKS LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_webhooks_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create indexes for webhooks log
CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON stripe_webhooks_log(event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON stripe_webhooks_log(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON stripe_webhooks_log(processed);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON stripe_webhooks_log(created_at DESC);

-- Add RLS policies for stripe_webhooks_log (admin only)
ALTER TABLE stripe_webhooks_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhooks log
-- No user policies needed


-- 4. ADD SUBSCRIPTION COLUMNS TO PROFILES TABLE
-- =====================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'household_premium')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Create indexes for new profile columns
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Set existing users to free tier
UPDATE profiles
SET subscription_tier = 'free', subscription_status = 'active'
WHERE subscription_tier IS NULL OR subscription_status IS NULL;


-- 5. CREATE TRIGGER TO UPDATE UPDATED_AT TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS subscription_updated_at ON subscriptions;

CREATE TRIGGER subscription_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();


-- 6. CREATE TRIGGER TO SYNC SUBSCRIPTION STATUS TO PROFILES
-- =====================================================
CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile with latest subscription info
  UPDATE profiles
  SET
    subscription_tier = NEW.plan_tier,
    subscription_status = NEW.status,
    stripe_customer_id = NEW.stripe_customer_id
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_subscription_status ON subscriptions;

CREATE TRIGGER sync_subscription_status
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_profile();


-- 7. GRANT NECESSARY PERMISSIONS
-- =====================================================
-- Grant select permissions to authenticated users on their own data
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON payment_history TO authenticated;

-- Service role needs full access for webhook handling
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON payment_history TO service_role;
GRANT ALL ON stripe_webhooks_log TO service_role;
GRANT UPDATE ON profiles TO service_role;


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created:
--   - subscriptions (with RLS policies)
--   - payment_history (with RLS policies)
--   - stripe_webhooks_log (with RLS policies)
--
-- Columns added to profiles:
--   - subscription_tier
--   - subscription_status
--   - stripe_customer_id
--
-- Triggers created:
--   - subscription_updated_at (auto-update timestamp)
--   - sync_subscription_status (sync to profiles)
-- =====================================================
