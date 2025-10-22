-- Check if the handle_new_user function exists and has storage location creation
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Check if any users have storage locations
SELECT COUNT(*) as total_users FROM profiles;
SELECT COUNT(DISTINCT user_id) as users_with_storage FROM storage_locations;
