import { createClient } from "@/utils/supabase/client"

export interface UserProfile {
  id: string
  display_name?: string
  bio?: string
  age?: number
  location?: string
  interests: string[]
  personality_traits: string[]
  preferences: Record<string, any>
  avatar_url?: string
  is_active: boolean
  last_active_at: string
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  age_range_min: number
  age_range_max: number
  preferred_personalities: string[]
  preferred_interests: string[]
  communication_style_preference?: string
  relationship_goals: string[]
  created_at: string
  updated_at: string
}

export interface UserStats {
  id: string
  user_id: string
  total_swipes: number
  total_likes: number
  total_passes: number
  total_super_likes: number
  total_matches: number
  total_conversations: number
  total_messages_sent: number
  created_at: string
  updated_at: string
}

/**
 * Ensures a user profile exists by calling the database function or creating directly
 * This handles cases where the trigger might have failed
 */
async function ensureUserProfileExists(userId: string): Promise<void> {
  const supabase = createClient()
  
  // First, try to call the database function if it exists
  const { error: rpcError } = await supabase.rpc('ensure_user_profile_exists', {
    p_user_id: userId
  })
  
  // If RPC doesn't exist or fails, try direct insert
  if (rpcError) {
    console.warn('RPC function not available or failed, trying direct insert:', rpcError.message)
    
    // Fallback: Try to create profile directly
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) return
    
    const displayName = user.user_metadata?.full_name || 
                       user.user_metadata?.name || 
                       user.user_metadata?.first_name ||
                       user.email?.split('@')[0] || 
                       'User'
    
    // Try to insert profile (ON CONFLICT will handle if it already exists)
    const { error: profileError } = await supabase.from('user_profiles').upsert({
      id: userId,
      display_name: displayName,
      avatar_url: user.user_metadata?.avatar_url || null
    }, {
      onConflict: 'id'
    })
    
    if (profileError && !profileError.message?.includes('duplicate') && !profileError.message?.includes('already exists')) {
      console.error('Failed to create user profile:', profileError)
    }
    
    // Try to insert stats
    const { error: statsError } = await supabase.from('user_stats').upsert({
      user_id: userId
    }, {
      onConflict: 'user_id'
    })
    
    if (statsError && !statsError.message?.includes('duplicate') && !statsError.message?.includes('already exists')) {
      console.error('Failed to create user stats:', statsError)
    }
    
    // Try to insert preferences
    const { error: prefsError } = await supabase.from('user_preferences').upsert({
      user_id: userId
    }, {
      onConflict: 'user_id'
    })
    
    if (prefsError && !prefsError.message?.includes('duplicate') && !prefsError.message?.includes('already exists')) {
      console.error('Failed to create user preferences:', prefsError)
    }
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let { data, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

  // If profile doesn't exist, try to create it
  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
      // Profile doesn't exist, try to create it
      try {
        await ensureUserProfileExists(user.id)
        // Retry fetching the profile
        const retryResult = await supabase.from("user_profiles").select("*").eq("id", user.id).single()
        if (retryResult.error) {
          console.error("Failed to create/fetch user profile:", retryResult.error)
          return null
        }
        data = retryResult.data
      } catch (createError: any) {
        console.error("Error ensuring user profile exists:", createError)
        return null
      }
    } else {
      throw new Error(`Failed to fetch user profile: ${error.message}`)
    }
  }

  return data
}

export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase.from("user_profiles").update(updates).eq("id", user.id).select().single()

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`)
  }

  return data
}

export async function getUserPreferences(): Promise<UserPreferences | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single()

  // If preferences don't exist, ensure profile exists first (which creates preferences)
  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
      try {
        await ensureUserProfileExists(user.id)
        // Retry fetching preferences
        const retryResult = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single()
        if (retryResult.error) {
          console.error("Failed to create/fetch user preferences:", retryResult.error)
          return null
        }
        data = retryResult.data
      } catch (createError: any) {
        console.error("Error ensuring user preferences exist:", createError)
        return null
      }
    } else {
      throw new Error(`Failed to fetch user preferences: ${error.message}`)
    }
  }

  return data
}

export async function updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase
    .from("user_preferences")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update user preferences: ${error.message}`)
  }

  return data
}

export async function getUserStats(): Promise<UserStats | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let { data, error } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single()

  // If stats don't exist, ensure profile exists first (which creates stats)
  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
      try {
        await ensureUserProfileExists(user.id)
        // Retry fetching stats
        const retryResult = await supabase.from("user_stats").select("*").eq("user_id", user.id).single()
        if (retryResult.error) {
          console.error("Failed to create/fetch user stats:", retryResult.error)
          return null
        }
        data = retryResult.data
      } catch (createError: any) {
        console.error("Error ensuring user stats exist:", createError)
        return null
      }
    } else {
      throw new Error(`Failed to fetch user stats: ${error.message}`)
    }
  }

  return data
}

export async function updateLastActive(): Promise<void> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from("user_profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", user.id)

  if (error) {
    console.error("Failed to update last active:", error.message)
  }
}
