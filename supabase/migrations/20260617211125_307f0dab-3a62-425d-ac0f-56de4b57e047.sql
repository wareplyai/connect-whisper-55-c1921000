
CREATE OR REPLACE FUNCTION public.auto_confirm_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved') THEN
    BEGIN
      UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_on_approval ON public.profiles;
CREATE TRIGGER trg_auto_confirm_on_approval
AFTER UPDATE OF approval_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_on_approval();

UPDATE auth.users u
SET email_confirmed_at = now()
FROM public.profiles p
WHERE p.id = u.id
  AND p.approval_status = 'approved'
  AND u.email_confirmed_at IS NULL;
