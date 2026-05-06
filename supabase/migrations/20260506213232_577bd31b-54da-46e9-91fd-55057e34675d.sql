CREATE OR REPLACE FUNCTION public.normalize_incoming_message_sender_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _candidate text;
  _session_phone text;
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
  WHERE (
      (digits ~ '^8801[0-9]{9}$')
      OR (digits ~ '^01[0-9]{9}$')
      OR (digits ~ '^1[0-9]{9}$')
    )
    AND digits <> coalesce(regexp_replace(_session_phone, '\D', '', 'g'), '')
  LIMIT 1;

  IF _candidate IS NOT NULL THEN
    NEW.from_number := _candidate;
  END IF;

  IF regexp_replace(coalesce(NEW.from_number, ''), '\D', '', 'g') ~ '^(23|52)[0-9]{12,14}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp sender id %. Baileys webhook must include the real customer JID/phone in raw_payload before logging incoming_messages.', NEW.from_number;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS normalize_incoming_message_sender_before_write ON public.incoming_messages;
CREATE TRIGGER normalize_incoming_message_sender_before_write
BEFORE INSERT OR UPDATE OF from_number, raw_payload
ON public.incoming_messages
FOR EACH ROW
EXECUTE FUNCTION public.normalize_incoming_message_sender_before_write();