-- Migration: Fix Profile RLS to Allow Clerk Users to Upsert Their Own Profiles
-- Date: 2025-10-23
-- Issue: Users cannot complete onboarding because RLS blocks profile upserts
-- Solution: Allow users to insert/update their own profiles (identified by Clerk JWT)

-- =====================================================
-- Drop old INSERT policy (service role only)
-- =====================================================
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- =====================================================
-- Create new INSERT policy (users can insert own profile)
-- =====================================================
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (
    public.clerk_user_id() = id
    OR current_setting('role', true) = 'service_role'
  );

-- =====================================================
-- Ensure UPDATE policy allows users to update own profile
-- (Already exists but recreate to be safe)
-- =====================================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    public.clerk_user_id() = id
    OR current_setting('role', true) = 'service_role'
  )
  WITH CHECK (
    public.clerk_user_id() = id
    OR current_setting('role', true) = 'service_role'
  );

-- =====================================================
-- Verification: Test that clerk_user_id() function exists
-- =====================================================
DO $$
BEGIN
  -- Verify function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'clerk_user_id'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'clerk_user_id() function not found. Run 20251022000000_clerk_compatibility.sql first.';
  END IF;

  RAISE NOTICE 'Profile RLS policies updated successfully for Clerk authentication';
END $$;
