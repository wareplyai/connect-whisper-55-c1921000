CREATE OR REPLACE FUNCTION public.normalize_incoming_message_sender_before_write_disabled()
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
  SELECT regexp_replace(coalesce(phone_number, ''), '\D', '', 'g')
  INTO _session_phone
  FROM public.sessions
  WHERE id = NEW.session_id;

  WITH RECURSIVE walk(value, key_name, depth) AS (
    SELECT NEW.raw_payload, ''::text, 0
    UNION ALL
    SELECT child.value, lower(regexp_replace(child.key, '[^a-z0-9_]', '', 'g')), walk.depth + 1
    FROM walk,
    LATERAL jsonb_each(CASE WHEN jsonb_typeof(walk.value) = 'object' THEN walk.value ELSE '{}'::jsonb END) AS child
    WHERE jsonb_typeof(walk.value) = 'object' AND walk.depth < 6
  ), candidates AS (
    SELECT
      regexp_replace(split_part(trim(both '"' from value::text), '@', 1), '\D', '', 'g') AS digits,
      trim(both '"' from value::text) AS raw_value,
      key_name,
      CASE
        WHEN key_name IN ('cleanedsenderpn','cleaned_sender_pn') THEN 0
        WHEN key_name IN ('senderpn','sender_pn') THEN 1
        WHEN key_name IN ('fromreal','from_real','customer','customernumber','customer_number') THEN 2
        WHEN key_name IN ('fromnumber','from_number') THEN 3
        WHEN key_name IN ('remotejid','remote_jid','remotejidalt','remote_jid_alt','participant','participantalt','participant_alt','jid','chatid','chat_id')
          AND trim(both '"' from value::text) ~* '@s\.whatsapp\.net' THEN 4
        WHEN key_name IN ('from','sender') THEN 5
        ELSE 9
      END AS priority
    FROM walk
    WHERE jsonb_typeof(value) = 'string'
  )
  SELECT digits INTO _candidate
  FROM candidates
  WHERE length(digits) BETWEEN 8 AND 15
    AND digits <> coalesce(_session_phone, '')
    AND raw_value !~* '@lid'
    AND raw_value !~* '@g\.us|status@broadcast|@broadcast'
    AND key_name NOT IN ('senderlid','sender_lid')
    AND digits !~ '^(23|13)\d{13}$'
  ORDER BY priority ASC, length(digits) DESC
  LIMIT 1;

  IF _candidate IS NOT NULL THEN
    NEW.from_number := _candidate;
  END IF;

  _normalized_from := regexp_replace(coalesce(NEW.from_number, ''), '\D', '', 'g');
  IF _normalized_from <> '' THEN
    NEW.from_number := _normalized_from;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.extract_real_customer_number_from_payload(_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE walk(value, key_name, depth) AS (
    SELECT _payload, ''::text, 0
    UNION ALL
    SELECT child.value, lower(regexp_replace(child.key, '[^a-z0-9_]', '', 'g')), walk.depth + 1
    FROM walk,
    LATERAL jsonb_each(CASE WHEN jsonb_typeof(walk.value) = 'object' THEN walk.value ELSE '{}'::jsonb END) AS child
    WHERE jsonb_typeof(walk.value) = 'object' AND walk.depth < 6
  ), candidates AS (
    SELECT
      regexp_replace(split_part(trim(both '"' from value::text), '@', 1), '\D', '', 'g') AS digits,
      trim(both '"' from value::text) AS raw_value,
      key_name,
      CASE
        WHEN key_name IN ('cleanedsenderpn','cleaned_sender_pn') THEN 0
        WHEN key_name IN ('senderpn','sender_pn') THEN 1
        WHEN key_name IN ('fromreal','from_real','customer','customernumber','customer_number') THEN 2
        WHEN key_name IN ('fromnumber','from_number') THEN 3
        WHEN key_name IN ('remotejid','remote_jid','remotejidalt','remote_jid_alt','participant','participantalt','participant_alt','jid','chatid','chat_id')
          AND trim(both '"' from value::text) ~* '@s\.whatsapp\.net' THEN 4
        WHEN key_name IN ('from','sender') THEN 5
        ELSE 9
      END AS priority
    FROM walk
    WHERE jsonb_typeof(value) = 'string'
  )
  SELECT digits
  FROM candidates
  WHERE length(digits) BETWEEN 8 AND 15
    AND raw_value !~* '@lid'
    AND raw_value !~* '@g\.us|status@broadcast|@broadcast'
    AND key_name NOT IN ('senderlid','sender_lid')
    AND digits !~ '^(23|13)\d{13}$'
  ORDER BY priority ASC, length(digits) DESC
  LIMIT 1;
$function$;

UPDATE public.incoming_messages im
SET from_number = public.extract_real_customer_number_from_payload(im.raw_payload),
    raw_payload = jsonb_set(
      coalesce(im.raw_payload, '{}'::jsonb),
      '{_number_fix}',
      jsonb_build_object('previous_from_number', im.from_number, 'fixed_at', now()),
      true
    )
WHERE coalesce(im.reply_sent, false) = false
  AND im.delivery_status IN ('pending','processing','failed','skipped')
  AND im.received_at > now() - interval '7 days'
  AND public.extract_real_customer_number_from_payload(im.raw_payload) IS NOT NULL
  AND public.extract_real_customer_number_from_payload(im.raw_payload) <> coalesce(im.from_number, '');

UPDATE public.incoming_messages
SET delivery_status = 'pending',
    reply_error = NULL
WHERE coalesce(reply_sent, false) = false
  AND delivery_status IN ('failed','skipped')
  AND received_at > now() - interval '24 hours'
  AND raw_payload ? '_number_fix';