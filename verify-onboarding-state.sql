-- Verification Script: Check Onboarding State for User
-- Run this in Supabase SQL Editor
-- User ID: user_341ww7D6dXue7wJSrthVxNaTfCD

-- ==================================================
-- 1. Check Profile State
-- ==================================================
SELECT
  id,
  email,
  full_name,
  onboarding_completed,
  onboarding_data,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  created_at,
  updated_at
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Expected:
-- onboarding_completed = FALSE (WRONG - should be TRUE)
-- onboarding_data = NULL (WRONG - should have JSON)
-- subscription_tier = 'basic' (CORRECT)
-- stripe_customer_id = NULL (CORRECT for Basic tier)

-- ==================================================
-- 2. Check Storage Locations
-- ==================================================
SELECT
  id,
  name,
  icon,
  user_id,
  created_at
FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'
ORDER BY name;

-- Expected: 3 rows (Pantry, Refrigerator, Freezer)
-- If 0 rows: Storage location creation was blocked by RLS

-- ==================================================
-- 3. Check User Achievements (Source of 406 Errors)
-- ==================================================
SELECT
  COUNT(*) as achievement_count,
  MIN(created_at) as first_achievement,
  MAX(created_at) as last_achievement
FROM user_achievements
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Expected: 0 achievements (new user)
-- This explains the 406 errors - badge checker calls .single() on empty table

-- ==================================================
-- 4. Check RLS Policies on Profiles Table
-- ==================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Expected policies:
-- - "Users can view own profile" FOR SELECT
-- - "Users can insert own profile" FOR INSERT
-- - "Users can update own profile" FOR UPDATE
-- All using: (SELECT auth.jwt()->>'sub') = id

-- ==================================================
-- 5. Test RLS with Mock JWT
-- ==================================================
-- This tests if RLS policies work when JWT is present
-- Set session variable to simulate authenticated request
SET LOCAL request.jwt.claims = '{"sub": "user_341ww7D6dXue7wJSrthVxNaTfCD"}';

-- Try to select profile (should work with JWT set)
SELECT id, email, onboarding_completed
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Reset session
RESET request.jwt.claims;

-- ==================================================
-- 6. Check Pantry Items
-- ==================================================
SELECT COUNT(*) as item_count
FROM pantry_items
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Expected: 0 items (new user hasn't added anything)

-- ==================================================
-- 7. Check Pantry Events (For Dashboard Metrics)
-- ==================================================
SELECT
  COUNT(*) as event_count,
  type,
  SUM(quantity) as total_quantity
FROM pantry_events
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'
GROUP BY type;

-- Expected: 0 events (new user)

-- ==================================================
-- 8. Diagnostic: Check if user_achievements table exists
-- ==================================================
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'user_achievements';

-- If this returns 0 rows, the table doesn't exist
-- That would explain 406 errors

-- ==================================================
-- 9. Check Table Row Counts (Overall)
-- ==================================================
SELECT
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM storage_locations) as total_locations,
  (SELECT COUNT(*) FROM user_achievements) as total_achievements,
  (SELECT COUNT(*) FROM pantry_items) as total_items,
  (SELECT COUNT(*) FROM pantry_events) as total_events;

-- ==================================================
-- MANUAL FIX (Run if needed)
-- ==================================================
-- Uncomment and run this to fix the user's profile:

/*
UPDATE profiles
SET
  onboarding_completed = TRUE,
  onboarding_data = jsonb_build_object(
    'subscription_tier', 'basic',
    'account_type', 'personal',
    'goals', '["reduce-waste", "save-money"]'::jsonb,
    'notifications_enabled', true,
    'onboarded_at', NOW()
  ),
  updated_at = NOW()
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Verify update
SELECT onboarding_completed, onboarding_data
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';
*/

-- ==================================================
-- STORAGE LOCATIONS FIX (Run if missing)
-- ==================================================
-- Uncomment and run if storage locations are missing:

/*
INSERT INTO storage_locations (user_id, name, icon)
VALUES
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Pantry', 'Package'),
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Refrigerator', 'Refrigerator'),
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Freezer', 'Snowflake')
ON CONFLICT (user_id, name) DO NOTHING;

-- Verify insert
SELECT name, icon FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'
ORDER BY name;
*/
