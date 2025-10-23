-- Migration: Switch to Clerk Native Supabase Integration
-- Date: 2025-10-23
-- Purpose: Replace custom clerk_user_id() function with Supabase's native auth.jwt()
-- Reason: Clerk JWT templates deprecated as of April 2025, native integration is the modern approach

-- =====================================================
-- STEP 1: Update profiles RLS policies to use auth.jwt()
-- =====================================================

-- Drop old policies that used clerk_user_id()
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Create new policies using Supabase's native auth.jwt()
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    (SELECT auth.jwt()->>'sub') = id
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (
    (SELECT auth.jwt()->>'sub') = id
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    (SELECT auth.jwt()->>'sub') = id
    OR current_setting('role', true) = 'service_role'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'sub') = id
    OR current_setting('role', true) = 'service_role'
  );

-- Keep service role policy
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');

-- =====================================================
-- STEP 2: Update other tables' RLS policies
-- =====================================================

-- Update pantry_items policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_items') THEN
    DROP POLICY IF EXISTS "Users can view own items" ON pantry_items;
    DROP POLICY IF EXISTS "Users can insert own items" ON pantry_items;
    DROP POLICY IF EXISTS "Users can update own items" ON pantry_items;
    DROP POLICY IF EXISTS "Users can delete own items" ON pantry_items;

    CREATE POLICY "Users can view own items"
      ON pantry_items FOR SELECT
      USING ((SELECT auth.jwt()->>'sub') = user_id);

    CREATE POLICY "Users can insert own items"
      ON pantry_items FOR INSERT
      WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

    CREATE POLICY "Users can update own items"
      ON pantry_items FOR UPDATE
      USING ((SELECT auth.jwt()->>'sub') = user_id);

    CREATE POLICY "Users can delete own items"
      ON pantry_items FOR DELETE
      USING ((SELECT auth.jwt()->>'sub') = user_id);
  END IF;
END $$;

-- Update storage_locations policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_locations') THEN
    DROP POLICY IF EXISTS "Users can view own locations" ON storage_locations;
    DROP POLICY IF EXISTS "Users can insert own locations" ON storage_locations;
    DROP POLICY IF EXISTS "Users can update own locations" ON storage_locations;
    DROP POLICY IF EXISTS "Users can delete own locations" ON storage_locations;

    CREATE POLICY "Users can view own locations"
      ON storage_locations FOR SELECT
      USING ((SELECT auth.jwt()->>'sub') = user_id);

    CREATE POLICY "Users can insert own locations"
      ON storage_locations FOR INSERT
      WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

    CREATE POLICY "Users can update own locations"
      ON storage_locations FOR UPDATE
      USING ((SELECT auth.jwt()->>'sub') = user_id);

    CREATE POLICY "Users can delete own locations"
      ON storage_locations FOR DELETE
      USING ((SELECT auth.jwt()->>'sub') = user_id);
  END IF;
END $$;

-- Update subscriptions policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;

    CREATE POLICY "Users can view own subscriptions"
      ON subscriptions FOR SELECT
      USING ((SELECT auth.jwt()->>'sub') = user_id);
  END IF;
END $$;

-- =====================================================
-- STEP 3: Keep clerk_user_id() function for backward compatibility
-- =====================================================
-- Don't drop it - some code might still reference it
-- It will now return the same value as auth.jwt()->>'sub'

-- =====================================================
-- Verification
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated to use Clerk native integration (auth.jwt())';
  RAISE NOTICE 'All policies now use (SELECT auth.jwt()->>''>''sub'') instead of clerk_user_id()';
END $$;
