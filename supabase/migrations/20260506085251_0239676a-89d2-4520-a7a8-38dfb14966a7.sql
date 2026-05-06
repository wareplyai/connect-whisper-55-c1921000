
-- 1. New columns on auto_reply_rules
ALTER TABLE public.auto_reply_rules
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS description text;

-- 2. New columns on incoming_messages for detailed troubleshooting
ALTER TABLE public.incoming_messages
  ADD COLUMN IF NOT EXISTS match_log jsonb,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- 3. Re-attach normalize triggers (idempotent)
DROP TRIGGER IF EXISTS trg_normalize_auto_reply_rule ON public.auto_reply_rules;
CREATE TRIGGER trg_normalize_auto_reply_rule
BEFORE INSERT OR UPDATE ON public.auto_reply_rules
FOR EACH ROW EXECUTE FUNCTION public.normalize_auto_reply_rule_before_write();

DROP TRIGGER IF EXISTS trg_auto_reply_rules_updated_at ON public.auto_reply_rules;
CREATE TRIGGER trg_auto_reply_rules_updated_at
BEFORE UPDATE ON public.auto_reply_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Indexes for fast per-user/per-session matching
CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_user_session
  ON public.auto_reply_rules(user_id, session_id, is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_incoming_messages_session
  ON public.incoming_messages(session_id, received_at DESC);

-- 5. REMOVE the unsafe public read policy (cross-user leak)
DROP POLICY IF EXISTS "gateway can read active auto reply rules" ON public.auto_reply_rules;

-- 6. STRICT per-user / per-session matcher
CREATE OR REPLACE FUNCTION public.match_auto_reply_for_message(
  p_session_id uuid,
  p_user_id uuid,
  p_message_text text
)
RETURNS TABLE (
  rule_id uuid,
  reply_template text,
  match_log jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _msg text := lower(coalesce(p_message_text, ''));
  _rule record;
  _matched boolean;
  _kw text;
  _log jsonb := '[]'::jsonb;
  _chosen_id uuid := NULL;
  _chosen_reply text := NULL;
  _why text;
BEGIN
  IF p_session_id IS NULL OR p_user_id IS NULL OR _msg = '' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text,
      jsonb_build_object('error', 'missing session_id, user_id, or message_text');
    RETURN;
  END IF;

  -- Verify session belongs to user (prevents cross-user matching)
  IF NOT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = p_session_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text,
      jsonb_build_object('error', 'session does not belong to user',
                         'session_id', p_session_id, 'user_id', p_user_id);
    RETURN;
  END IF;

  FOR _rule IN
    SELECT id, rule_name, keywords, match_type, reply_template, priority, session_id, category
    FROM public.auto_reply_rules
    WHERE user_id = p_user_id
      AND is_active = true
      AND (session_id IS NULL OR session_id = p_session_id)
    ORDER BY
      CASE WHEN session_id = p_session_id THEN 0 ELSE 1 END,
      priority DESC,
      created_at ASC
  LOOP
    _matched := false;
    _why := 'no keyword matched';

    FOREACH _kw IN ARRAY _rule.keywords LOOP
      IF _kw IS NULL OR _kw = '' THEN CONTINUE; END IF;
      IF _rule.match_type = 'exact' AND _msg = _kw THEN
        _matched := true; _why := 'exact:'||_kw; EXIT;
      ELSIF _rule.match_type = 'starts_with' AND _msg LIKE _kw||'%' THEN
        _matched := true; _why := 'starts_with:'||_kw; EXIT;
      ELSIF _rule.match_type = 'contains' AND position(_kw in _msg) > 0 THEN
        _matched := true; _why := 'contains:'||_kw; EXIT;
      END IF;
    END LOOP;

    _log := _log || jsonb_build_object(
      'rule_id', _rule.id,
      'rule_name', _rule.rule_name,
      'category', _rule.category,
      'match_type', _rule.match_type,
      'keywords', to_jsonb(_rule.keywords),
      'priority', _rule.priority,
      'session_scope', CASE WHEN _rule.session_id IS NULL THEN 'all' ELSE 'specific' END,
      'matched', _matched,
      'reason', _why
    );

    IF _matched AND _chosen_id IS NULL THEN
      _chosen_id := _rule.id;
      _chosen_reply := _rule.reply_template;
    END IF;
  END LOOP;

  IF _chosen_id IS NOT NULL THEN
    UPDATE public.auto_reply_rules
       SET match_count = match_count + 1
     WHERE id = _chosen_id;
  END IF;

  RETURN QUERY SELECT _chosen_id, _chosen_reply,
    jsonb_build_object(
      'message', p_message_text,
      'normalized', _msg,
      'session_id', p_session_id,
      'user_id', p_user_id,
      'chosen_rule_id', _chosen_id,
      'considered', _log
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_auto_reply_for_message(uuid, uuid, text)
  TO anon, authenticated, service_role;

-- 7. One-shot helper: log incoming message + match + reply intent
CREATE OR REPLACE FUNCTION public.log_incoming_message_with_match(
  p_session_id uuid,
  p_from_number text,
  p_message_text text,
  p_message_type text DEFAULT 'text',
  p_is_group boolean DEFAULT false,
  p_raw_payload jsonb DEFAULT NULL
)
RETURNS TABLE (
  message_id uuid,
  matched_rule_id uuid,
  reply_text text,
  match_log jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _msg_id uuid;
  _match record;
BEGIN
  SELECT user_id INTO _user_id FROM public.sessions WHERE id = p_session_id;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'session % not found', p_session_id;
  END IF;

  SELECT * INTO _match
  FROM public.match_auto_reply_for_message(p_session_id, _user_id, p_message_text);

  INSERT INTO public.incoming_messages
    (session_id, user_id, from_number, message_text, message_type, is_group,
     matched_rule_id, reply_text, reply_sent, raw_payload, match_log, processed_at)
  VALUES
    (p_session_id, _user_id, p_from_number, p_message_text, coalesce(p_message_type,'text'),
     coalesce(p_is_group,false), _match.rule_id, _match.reply_template, false,
     p_raw_payload, _match.match_log, now())
  RETURNING id INTO _msg_id;

  RETURN QUERY SELECT _msg_id, _match.rule_id, _match.reply_template, _match.match_log;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_incoming_message_with_match(uuid, text, text, text, boolean, jsonb)
  TO anon, authenticated, service_role;
