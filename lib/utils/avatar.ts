import { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

const PROFILE_PICS_BUCKET = 'profile-pics'

/**
 * Get the user's profile picture URL from the profile-pics bucket
 * Checks the user_profile_pics table for the profile_pic_key
 * Returns null if no profile picture exists (use placeholder)
 */
export async function getUserAvatarUrl(user: User | null | undefined, cacheBust?: boolean): Promise<string | null> {
  if (!user) return null
  
  try {
    const supabase = createClient()
    
    // Get the profile_pic_key from user_profile_pics table
    const { data: profilePic, error } = await supabase
      .from('user_profile_pics')
      .select('profile_pic_key')
      .eq('user_id', user.id)
      .single()
    
    // If table doesn't exist or no profile picture found, return null
    if (error) {
      // Check if it's a "table doesn't exist" error or just "no rows"
      if (error.code === 'PGRST116' || error.code === '42P01') {
        // No profile picture found or table doesn't exist - return null (use placeholder)
        return null
      }
      // For other errors, log and return null
      console.debug('Error fetching profile picture:', error.message)
      return null
    }
    
    if (!profilePic?.profile_pic_key) {
      // No profile picture found
      return null
    }
    
    // Get public URL from storage
    const { data: { publicUrl } } = supabase.storage
      .from(PROFILE_PICS_BUCKET)
      .getPublicUrl(profilePic.profile_pic_key)
    
    if (cacheBust) {
      const separator = publicUrl.includes('?') ? '&' : '?'
      return `${publicUrl}${separator}t=${Date.now()}`
    }
    
    return publicUrl
  } catch (error: any) {
    // Catch any unexpected errors and return null gracefully
    console.debug('Error fetching profile picture:', error?.message || error)
    return null
  }
}

/**
 * Get the user's avatar URL with a fallback placeholder
 */
export async function getUserAvatarUrlWithFallback(user: User | null | undefined): Promise<string> {
  const url = await getUserAvatarUrl(user)
  return url || '/placeholder.svg'
}

