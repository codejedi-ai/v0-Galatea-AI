-- Improved function to process swipe and create match/conversation
-- This function handles the complete swipe flow including match creation
CREATE OR REPLACE FUNCTION process_swipe_decision(
  p_user_id UUID,
  p_companion_id UUID,
  p_decision swipe_decision
)
RETURNS JSONB AS $$
DECLARE
  v_swipe_id UUID;
  v_match_id UUID;
  v_conversation_id UUID;
  v_is_match BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Insert swipe decision (with conflict handling)
  INSERT INTO public.swipe_decisions (user_id, companion_id, decision)
  VALUES (p_user_id, p_companion_id, p_decision)
  ON CONFLICT (user_id, companion_id) 
  DO UPDATE SET decision = p_decision
  RETURNING id INTO v_swipe_id;

  -- If it's a like or super_like, create/update match
  IF p_decision IN ('like', 'super_like') THEN
    -- Insert or get existing match
    INSERT INTO public.matches (user_id, companion_id)
    VALUES (p_user_id, p_companion_id)
    ON CONFLICT (user_id, companion_id) DO NOTHING
    RETURNING id INTO v_match_id;

    -- If no match was returned, get existing match
    IF v_match_id IS NULL THEN
      SELECT id INTO v_match_id
      FROM public.matches
      WHERE user_id = p_user_id AND companion_id = p_companion_id;
    END IF;

    -- Create conversation if it doesn't exist
    IF v_match_id IS NOT NULL THEN
      INSERT INTO public.conversations (user_id, companion_id, match_id)
      VALUES (p_user_id, p_companion_id, v_match_id)
      ON CONFLICT (user_id, companion_id) DO NOTHING
      RETURNING id INTO v_conversation_id;

      -- If no conversation was returned, get existing conversation
      IF v_conversation_id IS NULL THEN
        SELECT id INTO v_conversation_id
        FROM public.conversations
        WHERE user_id = p_user_id AND companion_id = p_companion_id;
      END IF;

      -- Mark as match (since user liked the companion)
      v_is_match := true;
    END IF;
  END IF;

  -- Build result JSON
  v_result := jsonb_build_object(
    'success', true,
    'swipe_id', v_swipe_id,
    'match_id', v_match_id,
    'conversation_id', v_conversation_id,
    'is_match', v_is_match,
    'decision', p_decision
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to get matches with full companion and conversation data
CREATE OR REPLACE FUNCTION get_user_matches_with_details(
  p_user_id UUID
)
RETURNS TABLE (
  match_id UUID,
  matched_at TIMESTAMP WITH TIME ZONE,
  companion_id UUID,
  companion_name TEXT,
  companion_age INTEGER,
  companion_bio TEXT,
  companion_image_url TEXT,
  companion_personality TEXT,
  companion_interests TEXT[],
  companion_compatibility_score INTEGER,
  conversation_id UUID,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_content TEXT,
  last_message_created_at TIMESTAMP WITH TIME ZONE,
  last_message_sender_id UUID,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id AS match_id,
    m.matched_at,
    c.id AS companion_id,
    c.name AS companion_name,
    c.age AS companion_age,
    c.bio AS companion_bio,
    c.image_url AS companion_image_url,
    c.personality AS companion_personality,
    c.interests AS companion_interests,
    c.compatibility_score AS companion_compatibility_score,
    conv.id AS conversation_id,
    conv.last_message_at,
    last_msg.content AS last_message_content,
    last_msg.created_at AS last_message_created_at,
    last_msg.sender_id AS last_message_sender_id,
    COALESCE(unread.count, 0) AS unread_count
  FROM public.matches m
  INNER JOIN public.companions c ON c.id = m.companion_id
  LEFT JOIN public.conversations conv ON conv.user_id = m.user_id AND conv.companion_id = m.companion_id
  LEFT JOIN LATERAL (
    SELECT content, created_at, sender_id
    FROM public.messages
    WHERE conversation_id = conv.id
    ORDER BY created_at DESC
    LIMIT 1
  ) last_msg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS count
    FROM public.messages
    WHERE conversation_id = conv.id
      AND is_read = false
      AND sender_id IS NULL
  ) unread ON true
  WHERE m.user_id = p_user_id
    AND m.is_active = true
    AND c.is_active = true
  ORDER BY 
    COALESCE(conv.last_message_at, m.matched_at) DESC,
    m.matched_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_swipe_decision(UUID, UUID, swipe_decision) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_matches_with_details(UUID) TO authenticated;

