CREATE OR REPLACE FUNCTION public.match_auto_reply_for_message(p_session_id uuid, p_user_id uuid, p_message_text text)
RETURNS TABLE(rule_id uuid, reply_template text, match_log jsonb)
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.sessions ses
    WHERE ses.id = p_session_id
      AND ses.user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text,
      jsonb_build_object(
        'error', 'session does not belong to user',
        'session_id', p_session_id,
        'user_id', p_user_id
      );
    RETURN;
  END IF;

  FOR _rule IN
    SELECT
      arr.id,
      arr.rule_name,
      arr.keywords,
      arr.match_type,
      arr.reply_template AS rule_reply_template,
      arr.priority,
      arr.session_id,
      arr.category,
      arr.created_at
    FROM public.auto_reply_rules arr
    WHERE arr.user_id = p_user_id
      AND arr.is_active = true
      AND (arr.session_id IS NULL OR arr.session_id = p_session_id)
    ORDER BY
      CASE WHEN arr.session_id = p_session_id THEN 0 ELSE 1 END,
      arr.priority DESC,
      arr.created_at ASC
  LOOP
    _matched := false;
    _why := 'no keyword matched';

    FOREACH _kw IN ARRAY _rule.keywords LOOP
      _kw := lower(coalesce(_kw, ''));
      IF _kw = '' THEN
        CONTINUE;
      END IF;

      IF _rule.match_type = 'exact' AND _msg = _kw THEN
        _matched := true;
        _why := 'exact:' || _kw;
        EXIT;
      ELSIF _rule.match_type = 'starts_with' AND _msg LIKE _kw || '%' THEN
        _matched := true;
        _why := 'starts_with:' || _kw;
        EXIT;
      ELSIF _rule.match_type = 'contains' AND position(_kw in _msg) > 0 THEN
        _matched := true;
        _why := 'contains:' || _kw;
        EXIT;
      END IF;
    END LOOP;

    _log := _log || jsonb_build_array(jsonb_build_object(
      'rule_id', _rule.id,
      'rule_name', _rule.rule_name,
      'category', _rule.category,
      'match_type', _rule.match_type,
      'keywords', to_jsonb(_rule.keywords),
      'priority', _rule.priority,
      'session_scope', CASE WHEN _rule.session_id IS NULL THEN 'all' ELSE 'specific' END,
      'matched', _matched,
      'reason', _why
    ));

    IF _matched AND _chosen_id IS NULL THEN
      _chosen_id := _rule.id;
      _chosen_reply := _rule.rule_reply_template;
    END IF;
  END LOOP;

  IF _chosen_id IS NOT NULL THEN
    UPDATE public.auto_reply_rules arr
    SET match_count = coalesce(arr.match_count, 0) + 1
    WHERE arr.id = _chosen_id;
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

CREATE OR REPLACE FUNCTION public.log_incoming_message_with_match(
  p_session_id uuid,
  p_from_number text,
  p_message_text text,
  p_message_type text DEFAULT 'text'::text,
  p_is_group boolean DEFAULT false,
  p_raw_payload jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(message_id uuid, matched_rule_id uuid, reply_text text, match_log jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _msg_id uuid;
  _match record;
BEGIN
  SELECT ses.user_id
  INTO _user_id
  FROM public.sessions ses
  WHERE ses.id = p_session_id;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'session % not found', p_session_id;
  END IF;

  SELECT m.rule_id, m.reply_template, m.match_log
  INTO _match
  FROM public.match_auto_reply_for_message(p_session_id, _user_id, p_message_text) m;

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

GRANT EXECUTE ON FUNCTION public.match_auto_reply_for_message(uuid, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_incoming_message_with_match(uuid, text, text, text, boolean, jsonb) TO anon, authenticated, service_role;