CREATE OR REPLACE FUNCTION public.normalize_incoming_message_sender_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _candidate text;
  _session_phone text;
  _normalized_from text;
BEGIN
  SELECT phone_number INTO _session_phone
  FROM public.sessions
  WHERE id = NEW.session_id;

  WITH RECURSIVE walk(value) AS (
    SELECT NEW.raw_payload
    UNION ALL
    SELECT child.value
    FROM walk,
    LATERAL jsonb_each(CASE WHEN jsonb_typeof(walk.value) = 'object' THEN walk.value ELSE '{}'::jsonb END) AS child
    WHERE jsonb_typeof(walk.value) = 'object'
  ), candidates AS (
    SELECT regexp_replace(
      split_part(trim(both '"' from value::text), '@', 1),
      '\D',
      '',
      'g'
    ) AS digits
    FROM walk
    WHERE jsonb_typeof(value) = 'string'
  )
  SELECT digits INTO _candidate
  FROM candidates
  WHERE digits ~ '^(8801[3-9][0-9]{8}|01[3-9][0-9]{8}|1[3-9][0-9]{8})$'
    AND digits <> coalesce(regexp_replace(_session_phone, '\D', '', 'g'), '')
  LIMIT 1;

  IF _candidate IS NOT NULL THEN
    NEW.from_number := _candidate;
  END IF;

  _normalized_from := regexp_replace(coalesce(NEW.from_number, ''), '\D', '', 'g');

  IF _normalized_from !~ '^(8801[3-9][0-9]{8}|01[3-9][0-9]{8}|1[3-9][0-9]{8})$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp sender id %. Baileys webhook must include the real Bangladesh customer phone in raw_payload before logging incoming_messages.', NEW.from_number;
  END IF;

  NEW.from_number := _normalized_from;
  RETURN NEW;
END;
$function$;

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
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _msg_id uuid;
BEGIN
  SELECT ses.user_id
  INTO _user_id
  FROM public.sessions ses
  WHERE ses.id = p_session_id;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'session % not found', p_session_id;
  END IF;

  INSERT INTO public.incoming_messages
    (session_id, user_id, from_number, message_text, message_type, is_group,
     matched_rule_id, reply_text, reply_sent, raw_payload, match_log, delivery_status, processed_at)
  VALUES
    (p_session_id, _user_id, p_from_number, p_message_text, coalesce(p_message_type,'text'),
     coalesce(p_is_group,false), NULL, NULL, false, p_raw_payload,
     jsonb_build_object('keyword_auto_reply_disabled', true), 'pending', NULL)
  RETURNING id INTO _msg_id;

  RETURN QUERY SELECT _msg_id, NULL::uuid, NULL::text,
    jsonb_build_object('keyword_auto_reply_disabled', true);
END;
$function$;

DROP TRIGGER IF EXISTS normalize_incoming_message_sender_before_write ON public.incoming_messages;
CREATE TRIGGER normalize_incoming_message_sender_before_write
BEFORE INSERT OR UPDATE OF from_number, raw_payload, session_id ON public.incoming_messages
FOR EACH ROW
EXECUTE FUNCTION public.normalize_incoming_message_sender_before_write();

DROP TRIGGER IF EXISTS queue_ai_reply_for_pending_message ON public.incoming_messages;
CREATE TRIGGER queue_ai_reply_for_pending_message
AFTER INSERT ON public.incoming_messages
FOR EACH ROW
WHEN (
  NEW.delivery_status = 'pending'
  AND coalesce(NEW.reply_sent, false) = false
  AND coalesce(NEW.message_type, 'text') = 'text'
  AND nullif(NEW.message_text, '') IS NOT NULL
)
EXECUTE FUNCTION public.queue_ai_reply_for_pending_message();

DROP TRIGGER IF EXISTS sync_connected_sessions_trigger ON public.sessions;
CREATE TRIGGER sync_connected_sessions_trigger
AFTER INSERT OR UPDATE OF status ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_connected_sessions();