
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS active_reply_mode text NOT NULL DEFAULT 'none';

ALTER TABLE public.business_profiles
  DROP CONSTRAINT IF EXISTS business_profiles_active_reply_mode_check;
ALTER TABLE public.business_profiles
  ADD CONSTRAINT business_profiles_active_reply_mode_check
  CHECK (active_reply_mode IN ('ai_agent','auto_reply','none'));

-- Backfill from existing ai_enabled flag
UPDATE public.business_profiles
SET active_reply_mode = CASE WHEN ai_enabled THEN 'ai_agent' ELSE 'none' END
WHERE active_reply_mode = 'none';

-- Relax sender normalization: never reject, just normalize when possible
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
      '\D', '', 'g'
    ) AS digits
    FROM walk
    WHERE jsonb_typeof(value) = 'string'
  )
  SELECT digits INTO _candidate
  FROM candidates
  WHERE length(digits) BETWEEN 8 AND 15
    AND digits <> coalesce(regexp_replace(_session_phone, '\D', '', 'g'), '')
  ORDER BY
    CASE WHEN digits ~ '^(8801[3-9][0-9]{8}|01[3-9][0-9]{8}|1[3-9][0-9]{8})$' THEN 0 ELSE 1 END
  LIMIT 1;

  IF _candidate IS NOT NULL THEN
    NEW.from_number := _candidate;
  END IF;

  _normalized_from := regexp_replace(coalesce(NEW.from_number, ''), '\D', '', 'g');
  IF _normalized_from <> '' THEN
    NEW.from_number := _normalized_from;
  END IF;

  -- Never reject; allow logging even non-BD or unknown senders
  RETURN NEW;
END;
$function$;
