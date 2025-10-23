-- =====================================================
-- Meal Saver Subscription System Functions
-- Description: Helper functions for subscription management
-- Date: 2025-10-16
-- =====================================================

-- 1. FUNCTION: Get User's Active Subscription
-- =====================================================
-- Returns the user's current active subscription details
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  tier TEXT,
  status TEXT,
  billing_interval TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.plan_tier,
    s.status,
    s.billing_interval,
    s.current_period_end,
    s.cancel_at_period_end,
    s.stripe_customer_id,
    s.stripe_subscription_id
  FROM subscriptions s
  WHERE s.user_id = p_user_id
  AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. FUNCTION: Check Feature Access
-- =====================================================
-- Checks if a user has access to a specific feature based on their subscription
CREATE OR REPLACE FUNCTION has_feature_access(
  p_user_id UUID,
  p_feature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
BEGIN
  -- Get user's subscription tier and status from profiles
  SELECT subscription_tier, subscription_status
  INTO v_tier, v_status
  FROM profiles
  WHERE id = p_user_id;

  -- If user not found, deny access
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Subscription must be active
  IF v_status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;

  -- Feature access rules
  CASE p_feature
    -- Basic/Free features (always accessible)
    WHEN 'basic_inventory' THEN
      RETURN TRUE;
    WHEN 'basic_scanner' THEN
      RETURN TRUE;
    WHEN 'basic_recipes' THEN
      RETURN TRUE;
    WHEN 'basic_analytics' THEN
      RETURN TRUE;

    -- Premium features (requires premium or household_premium)
    WHEN 'unlimited_items' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'unlimited_scanner' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'advanced_recipes' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'advanced_analytics' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'priority_support' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'all_notifications' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'extra_storage_locations' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'household_members_3' THEN
      RETURN v_tier IN ('premium', 'household_premium');

    -- Household Premium features (requires household_premium only)
    WHEN 'household_management' THEN
      RETURN v_tier = 'household_premium';
    WHEN 'unlimited_household_members' THEN
      RETURN v_tier = 'household_premium';
    WHEN 'unlimited_storage_locations' THEN
      RETURN v_tier = 'household_premium';
    WHEN 'household_analytics' THEN
      RETURN v_tier = 'household_premium';
    WHEN 'role_permissions' THEN
      RETURN v_tier = 'household_premium';

    ELSE
      -- Unknown feature, deny by default
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FUNCTION: Get Subscription Limits
-- =====================================================
-- Returns the limits for a user based on their subscription tier
CREATE OR REPLACE FUNCTION get_subscription_limits(p_user_id UUID)
RETURNS TABLE (
  max_pantry_items INTEGER,
  max_scanner_per_month INTEGER,
  max_recipes_per_week INTEGER,
  max_storage_locations INTEGER,
  max_household_members INTEGER,
  has_advanced_analytics BOOLEAN,
  has_priority_support BOOLEAN
) AS $$
DECLARE
  v_tier TEXT;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier
  INTO v_tier
  FROM profiles
  WHERE id = p_user_id;

  -- Return limits based on tier
  CASE v_tier
    WHEN 'basic' THEN
      RETURN QUERY SELECT
        50 AS max_pantry_items,
        10 AS max_scanner_per_month,
        3 AS max_recipes_per_week,
        3 AS max_storage_locations,
        1 AS max_household_members,
        FALSE AS has_advanced_analytics,
        FALSE AS has_priority_support;

    WHEN 'premium' THEN
      RETURN QUERY SELECT
        NULL AS max_pantry_items, -- unlimited
        NULL AS max_scanner_per_month, -- unlimited
        NULL AS max_recipes_per_week, -- unlimited
        5 AS max_storage_locations,
        3 AS max_household_members,
        TRUE AS has_advanced_analytics,
        TRUE AS has_priority_support;

    WHEN 'household_premium' THEN
      RETURN QUERY SELECT
        NULL AS max_pantry_items, -- unlimited
        NULL AS max_scanner_per_month, -- unlimited
        NULL AS max_recipes_per_week, -- unlimited
        NULL AS max_storage_locations, -- unlimited
        NULL AS max_household_members, -- unlimited
        TRUE AS has_advanced_analytics,
        TRUE AS has_priority_support;

    ELSE
      -- Default to basic tier if tier not found
      RETURN QUERY SELECT
        50 AS max_pantry_items,
        10 AS max_scanner_per_month,
        3 AS max_recipes_per_week,
        3 AS max_storage_locations,
        1 AS max_household_members,
        FALSE AS has_advanced_analytics,
        FALSE AS has_priority_support;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. FUNCTION: Check If User Can Add Pantry Item
-- =====================================================
-- Checks if user has reached their pantry item limit
CREATE OR REPLACE FUNCTION can_add_pantry_item(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_current_count INTEGER;
  v_max_items INTEGER;
BEGIN
  -- Get user's tier
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_user_id;

  -- Get current count of items
  SELECT COUNT(*) INTO v_current_count
  FROM pantry_items
  WHERE user_id = p_user_id;

  -- Check limits based on tier
  CASE v_tier
    WHEN 'basic' THEN
      v_max_items := 50;
    WHEN 'premium', 'household_premium' THEN
      RETURN TRUE; -- unlimited
    ELSE
      v_max_items := 50; -- default to basic
  END CASE;

  RETURN v_current_count < v_max_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. FUNCTION: Get Stripe Customer ID
-- =====================================================
-- Gets or returns null if user doesn't have a Stripe customer
CREATE OR REPLACE FUNCTION get_stripe_customer_id(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_customer_id TEXT;
BEGIN
  SELECT stripe_customer_id
  INTO v_customer_id
  FROM profiles
  WHERE id = p_user_id;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. FUNCTION: Update User Subscription Tier (for webhook)
-- =====================================================
-- Updates user's subscription tier (called by webhook edge function)
CREATE OR REPLACE FUNCTION update_user_subscription_tier(
  p_user_id UUID,
  p_tier TEXT,
  p_status TEXT,
  p_stripe_customer_id TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    subscription_tier = p_tier,
    subscription_status = p_status,
    stripe_customer_id = p_stripe_customer_id,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION has_feature_access(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_subscription_limits(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_add_pantry_item(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_stripe_customer_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_user_subscription_tier(UUID, TEXT, TEXT, TEXT) TO service_role;


-- =====================================================
-- FUNCTIONS MIGRATION COMPLETE
-- =====================================================
-- Functions created:
--   - get_user_subscription(user_id)
--   - has_feature_access(user_id, feature_name)
--   - get_subscription_limits(user_id)
--   - can_add_pantry_item(user_id)
--   - get_stripe_customer_id(user_id)
--   - update_user_subscription_tier(user_id, tier, status, customer_id)
-- =====================================================
