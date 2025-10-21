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
  INSERT INTO public.storage_locations (user_id, name, type, icon, color)
  VALUES
    (NEW.id, 'Pantry', 'pantry', '🍞', '#8B4513'),
    (NEW.id, 'Refrigerator', 'refrigerator', '❄️', '#4169E1'),
    (NEW.id, 'Freezer', 'freezer', '🧊', '#87CEEB');

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create profile/storage for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default storage locations for existing users who don't have any
INSERT INTO public.storage_locations (user_id, name, type, icon, color)
SELECT
  p.id,
  unnest(ARRAY['Pantry', 'Refrigerator', 'Freezer']),
  unnest(ARRAY['pantry', 'refrigerator', 'freezer']),
  unnest(ARRAY['🍞', '❄️', '🧊']),
  unnest(ARRAY['#8B4513', '#4169E1', '#87CEEB'])
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.storage_locations sl WHERE sl.user_id = p.id
);
