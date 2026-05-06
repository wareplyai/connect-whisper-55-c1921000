CREATE OR REPLACE FUNCTION public.normalize_auto_reply_keywords(_keywords text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT lower(trim(token)) ORDER BY lower(trim(token))),
    ARRAY[]::text[]
  )
  FROM unnest(COALESCE(_keywords, ARRAY[]::text[])) AS keyword_value
  CROSS JOIN LATERAL regexp_split_to_table(keyword_value, '[,\s]+') AS token
  WHERE trim(token) <> ''
$$;

CREATE OR REPLACE FUNCTION public.normalize_auto_reply_rule_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _target_session_id uuid;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.keywords := public.normalize_auto_reply_keywords(NEW.keywords);

  IF NEW.session_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = NEW.session_id
      AND s.user_id = NEW.user_id
  ) THEN
    _target_session_id := public.latest_session_for_user(NEW.user_id);
    IF _target_session_id IS NOT NULL THEN
      NEW.session_id := _target_session_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_auto_reply_session_id_before_write ON public.auto_reply_rules;
DROP TRIGGER IF EXISTS normalize_auto_reply_rule_before_write ON public.auto_reply_rules;

CREATE TRIGGER normalize_auto_reply_rule_before_write
BEFORE INSERT OR UPDATE ON public.auto_reply_rules
FOR EACH ROW
EXECUTE FUNCTION public.normalize_auto_reply_rule_before_write();

UPDATE public.auto_reply_rules ar
SET keywords = public.normalize_auto_reply_keywords(ar.keywords),
    session_id = COALESCE(ar.session_id, public.latest_session_for_user(ar.user_id)),
    updated_at = now()
WHERE ar.is_active = true
  AND (
    EXISTS (SELECT 1 FROM unnest(ar.keywords) AS keyword_value WHERE keyword_value ~ '[,\s]')
    OR ar.session_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = ar.session_id
        AND s.user_id = ar.user_id
    )
  );

DROP POLICY IF EXISTS "gateway can read active auto reply rules" ON public.auto_reply_rules;
CREATE POLICY "gateway can read active auto reply rules"
ON public.auto_reply_rules
FOR SELECT
TO anon, authenticated
USING (is_active = true);