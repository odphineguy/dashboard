-- Clear test user data (run this in Supabase SQL Editor)

-- Delete pantry items
DELETE FROM pantry_items WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day'
);

-- Delete household memberships
DELETE FROM household_members WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day'
);

-- Delete households
DELETE FROM households WHERE owner_id IN (
  SELECT id FROM profiles WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day'
);

-- Delete profiles (this will cascade to auth.users)
DELETE FROM profiles WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day';

-- Or to delete ALL profiles (use with caution):
-- TRUNCATE profiles, pantry_items, household_members, households, subscriptions, payment_history CASCADE;

