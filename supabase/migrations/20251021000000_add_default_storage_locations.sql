-- Update handle_new_user function to create default storage locations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    FALSE
  );

  -- Create default storage locations (Pantry, Refrigerator, Freezer)
  INSERT INTO public.storage_locations (user_id, name)
  VALUES
    (NEW.id, 'Pantry'),
    (NEW.id, 'Refrigerator'),
    (NEW.id, 'Freezer');

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create profile/storage for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default storage locations for existing users who don't have any
INSERT INTO public.storage_locations (user_id, name)
SELECT
  p.id,
  unnest(ARRAY['Pantry', 'Refrigerator', 'Freezer'])
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.storage_locations sl WHERE sl.user_id = p.id
);
