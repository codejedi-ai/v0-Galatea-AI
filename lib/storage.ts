import { createClient } from "@/utils/supabase/client";

const PROFILE_PICS_BUCKET = 'profile-pics';

/**
 * Upload a profile picture to the profile-pics bucket
 * Files are stored as: {userId}/{filename}
 * Updates the user_profile_pics table with the profile_pic_key
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Delete old profile picture if exists
  const { data: existingPic } = await supabase
    .from('user_profile_pics')
    .select('profile_pic_key')
    .eq('user_id', userId)
    .single();

  if (existingPic?.profile_pic_key) {
    try {
      await supabase.storage
        .from(PROFILE_PICS_BUCKET)
        .remove([existingPic.profile_pic_key]);
    } catch (error) {
      console.warn('Failed to delete old profile picture:', error);
    }
  }

  // Upload to profile-pics bucket
  const { data, error: uploadError } = await supabase.storage
    .from(PROFILE_PICS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Failed to upload profile picture: ${uploadError.message}`);
  }

  // Update user_profile_pics table with the profile_pic_key
  const { error: tableError } = await supabase
    .from('user_profile_pics')
    .upsert({
      user_id: userId,
      profile_pic_key: filePath
    }, {
      onConflict: 'user_id'
    });

  if (tableError) {
    // If table update fails, try to clean up the uploaded file
    await supabase.storage.from(PROFILE_PICS_BUCKET).remove([filePath]);
    throw new Error(`Failed to update profile picture record: ${tableError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(PROFILE_PICS_BUCKET)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Delete a profile picture for a user
 * Removes the file from storage and the record from user_profile_pics table
 */
export async function deleteProfilePicture(userId: string): Promise<void> {
  const supabase = createClient();
  
  // Get the profile_pic_key from the table
  const { data: profilePic, error: fetchError } = await supabase
    .from('user_profile_pics')
    .select('profile_pic_key')
    .eq('user_id', userId)
    .single();

  if (fetchError || !profilePic?.profile_pic_key) {
    // No profile picture to delete
    return;
  }

  // Remove the file from storage
  const { error: storageError } = await supabase.storage
    .from(PROFILE_PICS_BUCKET)
    .remove([profilePic.profile_pic_key]);

  if (storageError) {
    throw new Error(`Failed to delete profile picture from storage: ${storageError.message}`);
  }

  // Remove the record from user_profile_pics table
  const { error: tableError } = await supabase
    .from('user_profile_pics')
    .delete()
    .eq('user_id', userId);

  if (tableError) {
    console.error('Failed to delete profile picture record:', tableError);
    // Don't throw here since the file is already deleted
  }
}
