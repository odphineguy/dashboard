-- Clear User Data Script
-- This script removes all user-generated data while preserving Stripe configuration
-- Run this in Supabase SQL Editor

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = replica;

-- Clear user-generated data (in order to respect foreign key constraints)
TRUNCATE TABLE pantry_events CASCADE;
TRUNCATE TABLE pantry_items CASCADE;
TRUNCATE TABLE household_members CASCADE;
TRUNCATE TABLE households CASCADE;
TRUNCATE TABLE storage_locations CASCADE;
TRUNCATE TABLE payment_history CASCADE;
TRUNCATE TABLE subscriptions CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Note: You'll also need to manually delete users from Supabase Auth Dashboard
-- Go to: Authentication -> Users -> Select all -> Delete
