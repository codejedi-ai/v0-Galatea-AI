-- Add banner_url column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Create user_banners table to associate users with banner picture keys (similar to profile pics)
CREATE TABLE IF NOT EXISTS public.user_banners (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  banner_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on user_banners
ALTER TABLE public.user_banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_banners
CREATE POLICY "Users can view their own banner" ON public.user_banners
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own banner" ON public.user_banners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own banner" ON public.user_banners
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own banner" ON public.user_banners
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for profile-pics bucket (banners will be stored in same bucket with different path)
-- Users can upload banners to their own folder
CREATE POLICY "Users can upload their own banner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-pics' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'banner'
  );

CREATE POLICY "Users can update their own banner" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-pics' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'banner'
  );

CREATE POLICY "Users can delete their own banner" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-pics' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'banner'
  );

-- Function to update updated_at timestamp for user_banners
CREATE OR REPLACE FUNCTION update_user_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_user_banners_updated_at
  BEFORE UPDATE ON public.user_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_user_banners_updated_at();

