-- Normalize auto-reply rules so the VPS gateway can fetch them by session_id
-- Existing gateway code filters with .eq('session_id', sessionId), so NULL or stale session IDs never match.

CREATE OR REPLACE FUNCTION public.latest_session_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.sessions s
  WHERE s.user_id = _user_id
  ORDER BY
    CASE WHEN s.status = 'connected' THEN 0 ELSE 1 END,
    s.last_active DESC NULLS LAST,
    s.created_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.normalize_auto_reply_session_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_session_id uuid;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

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
CREATE TRIGGER normalize_auto_reply_session_id_before_write
BEFORE INSERT OR UPDATE ON public.auto_reply_rules
FOR EACH ROW
EXECUTE FUNCTION public.normalize_auto_reply_session_id();

-- Backfill existing active rules that are currently invisible to the VPS gateway.
UPDATE public.auto_reply_rules ar
SET session_id = public.latest_session_for_user(ar.user_id),
    updated_at = now()
WHERE ar.is_active = true
  AND public.latest_session_for_user(ar.user_id) IS NOT NULL
  AND (
    ar.session_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = ar.session_id
        AND s.user_id = ar.user_id
    )
  );