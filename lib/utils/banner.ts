import { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

const PROFILE_PICS_BUCKET = 'profile-pics'

/**
 * Get the user's banner URL from the profile-pics bucket
 * Checks the user_banners table for the banner_key
 * Returns null if no banner exists
 */
export async function getUserBannerUrl(user: User | null | undefined, cacheBust?: boolean): Promise<string | null> {
  if (!user) return null

  try {
    const supabase = createClient()

    // Get the banner_key from user_banners table using JOIN with user_profiles
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('id, user_banners(banner_key)')
      .eq('id', user.id)
      .single()

    // If table doesn't exist or no profile found, return null
    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return null
      }
      console.debug('Error fetching banner:', error.message)
      return null
    }

    // Extract banner_key from the joined data
    const bannerData = userProfile?.user_banners as any
    const bannerKey = Array.isArray(bannerData)
      ? bannerData[0]?.banner_key
      : bannerData?.banner_key

    if (!bannerKey) {
      return null
    }

    // Get public URL from storage
    const { data: { publicUrl } } = supabase.storage
      .from(PROFILE_PICS_BUCKET)
      .getPublicUrl(bannerKey)

    if (cacheBust) {
      const separator = publicUrl.includes('?') ? '&' : '?'
      return `${publicUrl}${separator}t=${Date.now()}`
    }

    return publicUrl
  } catch (error: any) {
    console.debug('Error fetching banner:', error?.message || error)
    return null
  }
}

/**
 * Get the user's banner URL with a fallback placeholder
 */
export async function getUserBannerUrlWithFallback(user: User | null | undefined): Promise<string> {
  const bannerUrl = await getUserBannerUrl(user)
  return bannerUrl || '/placeholder-banner.svg'
}

