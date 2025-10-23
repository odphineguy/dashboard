-- =====================================================
-- Migration: Clerk Authentication Compatibility
-- Date: 2025-10-22
-- Description: Updates database schema to work with Clerk user IDs
-- =====================================================

-- This migration makes the database compatible with Clerk authentication
-- by removing dependencies on Supabase's auth.users table and updating
-- RLS policies to work with Clerk JWTs

-- =====================================================
-- STEP 0: SAFETY CHECK - Prevent running on existing production data
-- =====================================================

-- This migration converts user_id from UUID to TEXT format for Clerk compatibility.
-- If you have existing subscriptions or payment history, this migration will orphan that data.
-- This migration should ONLY be run on fresh deployments with no existing subscription data.

DO $$
DECLARE
  subscription_count INTEGER;
  payment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO subscription_count FROM subscriptions;
  SELECT COUNT(*) INTO payment_count FROM payment_history;

  IF subscription_count > 0 OR payment_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION BLOCKED: Found % subscriptions and % payment records. This migration cannot run on existing production data as it will orphan billing records. Manual data migration required.', subscription_count, payment_count;
  END IF;

  RAISE NOTICE 'Safety check passed: No existing subscription or payment data found. Proceeding with migration.';
END $$;

-- =====================================================
-- STEP 1: Create custom auth function for Clerk
-- =====================================================

-- This function extracts the Clerk user ID from the JWT token
-- Clerk JWTs include the user ID in the 'sub' claim
-- Note: Creating in public schema since we don't have permission to modify auth schema
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.clerk_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clerk_user_id() TO anon;
GRANT EXECUTE ON FUNCTION public.clerk_user_id() TO service_role;

-- =====================================================
-- STEP 2: Drop ALL existing RLS policies first
-- =====================================================

-- Must drop ALL policies before altering column types they depend on
-- Drop all possible profile table policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON profiles;

-- Drop all possible subscription table policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Enable read access for own subscriptions" ON subscriptions;

-- Drop all possible payment_history table policies
DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can view their own payment history" ON payment_history;
DROP POLICY IF EXISTS "Service role can manage payment history" ON payment_history;
DROP POLICY IF EXISTS "Enable read access for own payment history" ON payment_history;

-- Drop ALL policies on tables we're modifying (more efficient than individual drops)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on pantry_items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_items') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'pantry_items' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON pantry_items';
    END LOOP;
  END IF;

  -- Drop all policies on pantry_events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_events') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'pantry_events' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON pantry_events';
    END LOOP;
  END IF;

  -- Drop all policies on storage_locations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_locations') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'storage_locations' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage_locations';
    END LOOP;
  END IF;

  -- Drop all policies on households
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'households') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'households' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON households';
    END LOOP;
  END IF;

  -- Drop all policies on household_members
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'household_members') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'household_members' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON household_members';
    END LOOP;
  END IF;

  -- Drop all policies on ai_saved_recipes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_saved_recipes') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ai_saved_recipes' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ai_saved_recipes';
    END LOOP;
  END IF;

  -- Drop all policies on user_achievements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_achievements' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_achievements';
    END LOOP;
  END IF;

  -- Drop all policies on household_invitations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'household_invitations') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'household_invitations' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON household_invitations';
    END LOOP;
  END IF;

  -- Drop all policies on user_integrations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_integrations') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_integrations' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_integrations';
    END LOOP;
  END IF;

  -- Drop all policies on activity_log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'activity_log' AND schemaname = 'public')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON activity_log';
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Update profiles table structure
-- =====================================================

-- Drop foreign key constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Change id from UUID to TEXT to support Clerk user IDs (e.g., "user_2abc123xyz")
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Add email column if not exists (used by Clerk webhook)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add UNIQUE constraint on email to prevent account takeover
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Standardize all existing 'free' tier users to 'basic'
UPDATE profiles SET subscription_tier = 'basic' WHERE subscription_tier = 'free';

-- Update subscription_tier to use 'basic' instead of 'free' to match Clerk webhook
ALTER TABLE profiles ALTER COLUMN subscription_tier SET DEFAULT 'basic';

-- Update check constraint to remove 'free' (standardized to 'basic')
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles
ADD CONSTRAINT profiles_subscription_tier_check
CHECK (subscription_tier IN ('basic', 'premium', 'household_premium'));

-- =====================================================
-- STEP 4: Update subscriptions table
-- =====================================================

-- Drop foreign key to auth.users
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- Change user_id from UUID to TEXT and allow NULL (for deleted users)
DO $$ BEGIN
  -- Drop NOT NULL constraint first if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions'
    AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE subscriptions ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  -- Then change type
  EXECUTE 'ALTER TABLE subscriptions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT';
END $$;

-- Add foreign key to profiles table instead of auth.users (SET NULL to preserve billing records)
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Recreate RLS policies using Clerk auth function
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (
    public.clerk_user_id() = user_id
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');

-- =====================================================
-- STEP 5: Update payment_history table
-- =====================================================

-- Drop foreign key to auth.users
ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_user_id_fkey;

-- Change user_id from UUID to TEXT and allow NULL (for deleted users)
DO $$ BEGIN
  -- Drop NOT NULL constraint first if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_history'
    AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE payment_history ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  -- Then change type
  EXECUTE 'ALTER TABLE payment_history ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT';
END $$;

-- Add foreign key to profiles table (SET NULL to preserve payment audit trail)
ALTER TABLE payment_history
ADD CONSTRAINT payment_history_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Recreate RLS policies
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  USING (
    public.clerk_user_id() = user_id
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Service role can manage payment history"
  ON payment_history FOR ALL
  USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');

-- =====================================================
-- STEP 6: Recreate profiles table RLS policies
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    public.clerk_user_id() = id
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    public.clerk_user_id() = id
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (current_setting('role', true) = 'service_role');

CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');

-- =====================================================
-- STEP 7: Update other tables with user_id references
-- =====================================================

-- Update pantry_items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_items') THEN
    ALTER TABLE pantry_items DROP CONSTRAINT IF EXISTS pantry_items_user_id_fkey;
    ALTER TABLE pantry_items ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    ALTER TABLE pantry_items
    ADD CONSTRAINT pantry_items_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

    -- Add foreign key constraint for household_id (prevent orphaned items)
    ALTER TABLE pantry_items DROP CONSTRAINT IF EXISTS pantry_items_household_id_fkey;
    ALTER TABLE pantry_items
    ADD CONSTRAINT pantry_items_household_id_fkey
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update pantry_events
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_events') THEN
    ALTER TABLE pantry_events DROP CONSTRAINT IF EXISTS pantry_events_user_id_fkey;
    ALTER TABLE pantry_events ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    ALTER TABLE pantry_events
    ADD CONSTRAINT pantry_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update storage_locations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_locations') THEN
    ALTER TABLE storage_locations DROP CONSTRAINT IF EXISTS storage_locations_user_id_fkey;
    ALTER TABLE storage_locations ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    ALTER TABLE storage_locations
    ADD CONSTRAINT storage_locations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update households (created_by field)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'households') THEN
    ALTER TABLE households DROP CONSTRAINT IF EXISTS households_created_by_fkey;
    ALTER TABLE households ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
    ALTER TABLE households
    ADD CONSTRAINT households_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update household_members
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'household_members') THEN
    ALTER TABLE household_members DROP CONSTRAINT IF EXISTS household_members_user_id_fkey;
    ALTER TABLE household_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    ALTER TABLE household_members
    ADD CONSTRAINT household_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update ai_saved_recipes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_saved_recipes') THEN
    ALTER TABLE ai_saved_recipes DROP CONSTRAINT IF EXISTS ai_saved_recipes_user_id_fkey;
    ALTER TABLE ai_saved_recipes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    ALTER TABLE ai_saved_recipes
    ADD CONSTRAINT ai_saved_recipes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update user_achievements
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements') THEN
    ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;
    ALTER TABLE user_achievements ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    ALTER TABLE user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update household_invitations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'household_invitations') THEN
    ALTER TABLE household_invitations DROP CONSTRAINT IF EXISTS household_invitations_invited_by_fkey;
    ALTER TABLE household_invitations ALTER COLUMN invited_by TYPE TEXT USING invited_by::TEXT;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='household_invitations' AND column_name='user_id') THEN
      ALTER TABLE household_invitations ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;
  END IF;
END $$;

-- Update user_integrations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_integrations') THEN
    ALTER TABLE user_integrations DROP CONSTRAINT IF EXISTS user_integrations_user_id_fkey;
    ALTER TABLE user_integrations ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    ALTER TABLE user_integrations
    ADD CONSTRAINT user_integrations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update activity_log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
    -- Drop all foreign key constraints first
    ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_created_by_fkey;
    ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

    -- Update created_by column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='activity_log' AND column_name='created_by') THEN
      ALTER TABLE activity_log ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
    END IF;

    -- Update user_id column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='activity_log' AND column_name='user_id') THEN
      ALTER TABLE activity_log ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      -- Re-add foreign key constraint
      ALTER TABLE activity_log
      ADD CONSTRAINT activity_log_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 8: Recreate RLS policies for pantry tables
-- =====================================================

-- Pantry items policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_items') THEN
    ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own pantry items"
      ON pantry_items FOR SELECT
      USING (
        public.clerk_user_id() = user_id OR
        household_id IN (
          SELECT household_id FROM household_members
          WHERE user_id = public.clerk_user_id()
        ) OR
        current_setting('role', true) = 'service_role'
      );

    CREATE POLICY "Users can insert own pantry items"
      ON pantry_items FOR INSERT
      WITH CHECK (
        public.clerk_user_id() = user_id
        OR current_setting('role', true) = 'service_role'
      );

    CREATE POLICY "Users can update own pantry items"
      ON pantry_items FOR UPDATE
      USING (
        public.clerk_user_id() = user_id OR
        household_id IN (
          SELECT household_id FROM household_members
          WHERE user_id = public.clerk_user_id()
        ) OR
        current_setting('role', true) = 'service_role'
      );

    CREATE POLICY "Users can delete own pantry items"
      ON pantry_items FOR DELETE
      USING (
        public.clerk_user_id() = user_id OR
        household_id IN (
          SELECT household_id FROM household_members
          WHERE user_id = public.clerk_user_id()
        ) OR
        current_setting('role', true) = 'service_role'
      );
  END IF;
END $$;

-- Storage locations policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_locations') THEN
    ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own storage locations"
      ON storage_locations FOR SELECT
      USING (
        public.clerk_user_id() = user_id
        OR current_setting('role', true) = 'service_role'
      );

    CREATE POLICY "Users can manage own storage locations"
      ON storage_locations FOR ALL
      USING (
        public.clerk_user_id() = user_id
        OR current_setting('role', true) = 'service_role'
      )
      WITH CHECK (
        public.clerk_user_id() = user_id
        OR current_setting('role', true) = 'service_role'
      );
  END IF;
END $$;

-- =====================================================
-- STEP 9: Update database functions
-- =====================================================

-- Update get_user_subscription function
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id TEXT)
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
  -- Validate user_id parameter
  IF p_user_id IS NULL OR p_user_id = '' OR LENGTH(p_user_id) > 100 THEN
    RAISE EXCEPTION 'Invalid user_id parameter';
  END IF;

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

-- Update has_feature_access function
CREATE OR REPLACE FUNCTION has_feature_access(
  p_user_id TEXT,
  p_feature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
BEGIN
  -- Validate parameters
  IF p_user_id IS NULL OR p_user_id = '' OR LENGTH(p_user_id) > 100 THEN
    RAISE EXCEPTION 'Invalid user_id parameter';
  END IF;

  IF p_feature IS NULL OR p_feature = '' OR LENGTH(p_feature) > 50 THEN
    RAISE EXCEPTION 'Invalid feature parameter';
  END IF;

  SELECT subscription_tier, subscription_status
  INTO v_tier, v_status
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;

  -- Feature access logic
  CASE p_feature
    WHEN 'basic_inventory' THEN
      RETURN TRUE;
    WHEN 'unlimited_items' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'unlimited_scanner' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'advanced_recipes' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'extra_storage_locations' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'household_members' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'unlimited_household_members' THEN
      RETURN v_tier = 'household_premium';
    WHEN 'advanced_analytics' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    WHEN 'priority_support' THEN
      RETURN v_tier IN ('premium', 'household_premium');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_subscription_limits function
CREATE OR REPLACE FUNCTION get_subscription_limits(p_user_id TEXT)
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
  -- Validate user_id parameter
  IF p_user_id IS NULL OR p_user_id = '' OR LENGTH(p_user_id) > 100 THEN
    RAISE EXCEPTION 'Invalid user_id parameter';
  END IF;

  SELECT subscription_tier
  INTO v_tier
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    v_tier := 'basic';
  END IF;

  CASE v_tier
    WHEN 'basic' THEN
      RETURN QUERY SELECT 50, 10, 3, 3, 1, FALSE, FALSE;
    WHEN 'premium' THEN
      RETURN QUERY SELECT 999999, 999999, 999999, 5, 3, TRUE, TRUE;
    WHEN 'household_premium' THEN
      RETURN QUERY SELECT 999999, 999999, 999999, 999999, 999999, TRUE, TRUE;
    ELSE
      RETURN QUERY SELECT 50, 10, 3, 3, 1, FALSE, FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update can_add_pantry_item function
CREATE OR REPLACE FUNCTION can_add_pantry_item(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_current_count INTEGER;
  v_max_items INTEGER;
BEGIN
  -- Validate user_id parameter
  IF p_user_id IS NULL OR p_user_id = '' OR LENGTH(p_user_id) > 100 THEN
    RAISE EXCEPTION 'Invalid user_id parameter';
  END IF;

  SELECT subscription_tier
  INTO v_tier
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get current item count
  SELECT COUNT(*)
  INTO v_current_count
  FROM pantry_items
  WHERE user_id = p_user_id;

  -- Get max items for tier
  SELECT max_pantry_items
  INTO v_max_items
  FROM get_subscription_limits(p_user_id);

  RETURN v_current_count < v_max_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_stripe_customer_id function
CREATE OR REPLACE FUNCTION get_stripe_customer_id(p_user_id TEXT)
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

-- Update update_user_subscription_tier function
CREATE OR REPLACE FUNCTION update_user_subscription_tier(
  p_user_id TEXT,
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

-- =====================================================
-- STEP 10: Disable Supabase auth trigger
-- =====================================================

-- Drop the trigger that creates profiles on auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function if no longer needed
DROP FUNCTION IF EXISTS public.handle_new_user();

-- =====================================================
-- STEP 11: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_items') THEN
    CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_events') THEN
    CREATE INDEX IF NOT EXISTS idx_pantry_events_user_id ON pantry_events(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_locations') THEN
    CREATE INDEX IF NOT EXISTS idx_storage_locations_user_id ON storage_locations(user_id);
  END IF;
END $$;

-- Household members indexes for RLS performance
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'household_members') THEN
    CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
  END IF;
END $$;

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier_status
ON profiles(subscription_tier, subscription_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_active
ON subscriptions(user_id, status) WHERE status IN ('active', 'trialing', 'past_due');

-- =====================================================
-- Migration Complete
-- =====================================================

-- This migration allows Clerk users to work with the database by:
-- 1. Creating auth.clerk_user_id() function to extract Clerk user ID from JWT
-- 2. Converting all user_id columns from UUID to TEXT
-- 3. Updating all foreign keys to reference profiles table
-- 4. Recreating RLS policies to use Clerk auth function
-- 5. Updating database functions to accept TEXT user IDs
-- 6. Disabling Supabase auth trigger (Clerk webhook handles profile creation)
