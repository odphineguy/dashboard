-- Quick Fix Script for User Profile
-- User: user_341ww7D6dXue7wJSrthVxNaTfCD
-- Run this in Supabase SQL Editor to fix the broken onboarding state

-- ==================================================
-- STEP 1: Verify Current State (Before Fix)
-- ==================================================
SELECT
  id,
  email,
  full_name,
  onboarding_completed,
  onboarding_data,
  subscription_tier,
  subscription_status,
  created_at,
  updated_at
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Expected output:
-- onboarding_completed: false (WRONG)
-- onboarding_data: null (WRONG)
-- subscription_tier: basic (CORRECT)

-- ==================================================
-- STEP 2: Fix Profile Data
-- ==================================================
UPDATE profiles
SET
  onboarding_completed = TRUE,
  onboarding_data = jsonb_build_object(
    'subscription_tier', 'basic',
    'account_type', 'personal',
    'goals', '["reduce-waste", "save-money", "meal-planning", "health"]'::jsonb,
    'notifications_enabled', true,
    'household_name', null,
    'household_size', null,
    'onboarded_at', NOW()
  ),
  updated_at = NOW()
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- This should return: UPDATE 1

-- ==================================================
-- STEP 3: Verify Fix (After Update)
-- ==================================================
SELECT
  id,
  email,
  onboarding_completed,
  onboarding_data->>'subscription_tier' as tier,
  onboarding_data->>'account_type' as account_type,
  onboarding_data->'goals' as goals,
  onboarding_data->>'onboarded_at' as onboarded_at,
  updated_at
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Expected output:
-- onboarding_completed: true ✅
-- tier: basic ✅
-- account_type: personal ✅
-- goals: ["reduce-waste", "save-money", "meal-planning", "health"] ✅

-- ==================================================
-- STEP 4: Check Storage Locations
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
-- If 0 rows, continue to STEP 5

-- ==================================================
-- STEP 5: Create Storage Locations (if missing)
-- ==================================================
-- Run this only if STEP 4 returned 0 rows

INSERT INTO storage_locations (user_id, name, icon)
VALUES
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Pantry', 'Package'),
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Refrigerator', 'Refrigerator'),
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Freezer', 'Snowflake')
ON CONFLICT (user_id, name) DO NOTHING;

-- This should return: INSERT 0 3

-- Verify insert:
SELECT COUNT(*) as location_count, user_id
FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'
GROUP BY user_id;

-- Expected: location_count = 3 ✅

-- ==================================================
-- STEP 6: Final Verification
-- ==================================================
SELECT
  'Profile' as check_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE onboarding_completed = TRUE) as completed_count
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'

UNION ALL

SELECT
  'Storage Locations' as check_type,
  COUNT(*) as count,
  NULL as completed_count
FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'

UNION ALL

SELECT
  'Pantry Items' as check_type,
  COUNT(*) as count,
  NULL as completed_count
FROM pantry_items
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'

UNION ALL

SELECT
  'Pantry Events' as check_type,
  COUNT(*) as count,
  NULL as completed_count
FROM pantry_events
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Expected:
-- Profile: count=1, completed_count=1 ✅
-- Storage Locations: count=3 ✅
-- Pantry Items: count=0 (new user) ✅
-- Pantry Events: count=0 (new user) ✅

-- ==================================================
-- COMPLETE! User profile is now fixed
-- ==================================================
-- The user should now be able to:
-- ✅ Access dashboard without errors
-- ✅ See their profile information
-- ✅ Add pantry items
-- ✅ Use all app features

-- ==================================================
-- CLEANUP (Optional)
-- ==================================================
-- If you want to reset the user back to pre-onboarding state:
-- (DO NOT RUN unless you need to test onboarding again)

/*
UPDATE profiles
SET
  onboarding_completed = FALSE,
  onboarding_data = NULL,
  updated_at = NOW()
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

DELETE FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';
*/
