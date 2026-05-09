-- 1) Drop existing phone-uniqueness indexes BEFORE we touch data
DROP INDEX IF EXISTS public.unique_active_phone;
DROP INDEX IF EXISTS public.unique_session_phone_number;
DROP INDEX IF EXISTS public.unique_session_phone_number_digits;

-- 2) Normalizer
CREATE OR REPLACE FUNCTION public.normalize_whatsapp_phone(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(coalesce(_phone, ''), '\D', '', 'g'), '');
$$;

-- 3) Trigger that keeps phone_number stored as digits only
CREATE OR REPLACE FUNCTION public.normalize_session_phone_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.phone_number := public.normalize_whatsapp_phone(NEW.phone_number);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_session_phone_number ON public.sessions;
CREATE TRIGGER trg_normalize_session_phone_number
BEFORE INSERT OR UPDATE OF phone_number ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.normalize_session_phone_number();

-- 4) Resolve existing duplicates BEFORE creating the new unique index.
-- Compare on normalized digits. Keep earliest session per number; clear the rest.
WITH ranked AS (
  SELECT
    id,
    public.normalize_whatsapp_phone(phone_number) AS digits,
    row_number() OVER (
      PARTITION BY public.normalize_whatsapp_phone(phone_number)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.sessions
  WHERE phone_number IS NOT NULL
    AND public.normalize_whatsapp_phone(phone_number) IS NOT NULL
)
UPDATE public.sessions s
SET
  phone_number = NULL,
  status = 'disconnected',
  last_active = NULL
FROM ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- 5) Normalize the surviving rows
UPDATE public.sessions
SET phone_number = public.normalize_whatsapp_phone(phone_number)
WHERE phone_number IS NOT NULL
  AND phone_number IS DISTINCT FROM public.normalize_whatsapp_phone(phone_number);

-- 6) Strict global uniqueness on normalized digits
CREATE UNIQUE INDEX unique_session_phone_number_digits
  ON public.sessions (public.normalize_whatsapp_phone(phone_number))
  WHERE phone_number IS NOT NULL;

-- 7) Safe cross-account availability check
CREATE OR REPLACE FUNCTION public.is_session_phone_available(_phone text, _exclude_session_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.phone_number IS NOT NULL
      AND public.normalize_whatsapp_phone(s.phone_number) = public.normalize_whatsapp_phone(_phone)
      AND (_exclude_session_id IS NULL OR s.id <> _exclude_session_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_session_phone_available(text, uuid) TO authenticated;