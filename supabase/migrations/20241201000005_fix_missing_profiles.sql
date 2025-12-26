-- Fix missing user profiles and make trigger more robust
-- This migration ensures all users have profiles and handles edge cases

-- Function to ensure user profile exists (can be called safely multiple times)
CREATE OR REPLACE FUNCTION ensure_user_profile_exists(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Check if profile exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
    INSERT INTO public.user_profiles (id, display_name, avatar_url)
    SELECT 
      u.id,
      COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        u.raw_user_meta_data->>'first_name',
        split_part(u.email, '@', 1),
        'User'
      ),
      u.raw_user_meta_data->>'avatar_url'
    FROM auth.users u
    WHERE u.id = p_user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Check if stats exist, if not create them
  IF NOT EXISTS (SELECT 1 FROM public.user_stats WHERE user_id = p_user_id) THEN
    INSERT INTO public.user_stats (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Check if preferences exist, if not create them
  IF NOT EXISTS (SELECT 1 FROM public.user_preferences WHERE user_id = p_user_id) THEN
    INSERT INTO public.user_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use ON CONFLICT to handle cases where profile might already exist
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'first_name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
      EXCLUDED.display_name,
      user_profiles.display_name,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'first_name',
        split_part(NEW.email, '@', 1),
        'User'
      )
    ),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url, NEW.raw_user_meta_data->>'avatar_url');
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix any existing users who don't have profiles
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users in auth.users
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.user_profiles)
  LOOP
    -- Create missing profile
    BEGIN
      INSERT INTO public.user_profiles (id, display_name, avatar_url)
      VALUES (
        user_record.id,
        COALESCE(
          user_record.raw_user_meta_data->>'full_name',
          user_record.raw_user_meta_data->>'name',
          user_record.raw_user_meta_data->>'first_name',
          split_part(user_record.email, '@', 1),
          'User'
        ),
        user_record.raw_user_meta_data->>'avatar_url'
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', user_record.id, SQLERRM;
    END;

    -- Create missing stats
    BEGIN
      INSERT INTO public.user_stats (user_id)
      VALUES (user_record.id)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create stats for user %: %', user_record.id, SQLERRM;
    END;

    -- Create missing preferences
    BEGIN
      INSERT INTO public.user_preferences (user_id)
      VALUES (user_record.id)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create preferences for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
END $$;

