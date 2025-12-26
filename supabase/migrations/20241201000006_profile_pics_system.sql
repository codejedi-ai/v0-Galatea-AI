-- Create profile-pics bucket and user_profile_pics table
-- This migration sets up the new profile picture system

-- Create the profile-pics storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pics',
  'profile-pics',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create user_profile_pics table to associate users with profile picture keys
CREATE TABLE IF NOT EXISTS public.user_profile_pics (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  profile_pic_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on user_profile_pics
ALTER TABLE public.user_profile_pics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profile_pics
CREATE POLICY "Users can view their own profile pic" ON public.user_profile_pics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile pic" ON public.user_profile_pics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile pic" ON public.user_profile_pics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile pic" ON public.user_profile_pics
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for profile-pics bucket
CREATE POLICY "Anyone can view profile pics" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-pics');

CREATE POLICY "Users can upload their own profile pic" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-pics' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile pic" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-pics' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile pic" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-pics' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profile_pics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_user_profile_pics_updated_at
  BEFORE UPDATE ON public.user_profile_pics
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_pics_updated_at();

