import { createClient } from "@/utils/supabase/client"
import type { Companion } from "./companions"

export interface Match {
  id: string
  user_id: string
  companion_id: string
  matched_at: string
  is_active: boolean
  companion?: Companion
}

export interface MatchWithDetails {
  match_id: string
  matched_at: string
  companion: {
    id: string
    name: string
    age: number
    bio: string
    image_url: string
    personality: string
    interests: string[]
    compatibility_score?: number
  }
  conversation_id?: string
  last_message?: {
    content: string
    created_at: string
    sender_id?: string
  }
  unread_count: number
}

export async function getUserMatches(): Promise<Match[]> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      companion:companions(*)
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("matched_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch matches: ${error.message}`)
  }

  return data || []
}

export async function getUserMatchesWithDetails(): Promise<MatchWithDetails[]> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  // Use the database function for better performance
  const { data, error } = await supabase.rpc("get_user_matches_with_details", {
    p_user_id: user.id,
  })

  if (error) {
    throw new Error(`Failed to fetch matches with details: ${error.message}`)
  }

  // Transform the data to match our interface
  return (data || []).map((row: any) => ({
    match_id: row.match_id,
    matched_at: row.matched_at,
    companion: {
      id: row.companion_id,
      name: row.companion_name,
      age: row.companion_age,
      bio: row.companion_bio,
      image_url: row.companion_image_url,
      personality: row.companion_personality,
      interests: row.companion_interests || [],
      compatibility_score: row.companion_compatibility_score,
    },
    conversation_id: row.conversation_id || undefined,
    last_message: row.last_message_content
      ? {
          content: row.last_message_content,
          created_at: row.last_message_created_at,
          sender_id: row.last_message_sender_id || undefined,
        }
      : undefined,
    unread_count: Number(row.unread_count) || 0,
  }))
}

export async function getMatchById(matchId: string): Promise<Match | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      companion:companions(*)
    `)
    .eq("id", matchId)
    .eq("user_id", user.id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to fetch match: ${error.message}`)
  }

  return data
}

export async function deactivateMatch(matchId: string): Promise<void> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { error } = await supabase.from("matches").update({ is_active: false }).eq("id", matchId).eq("user_id", user.id)

  if (error) {
    throw new Error(`Failed to deactivate match: ${error.message}`)
  }
}
