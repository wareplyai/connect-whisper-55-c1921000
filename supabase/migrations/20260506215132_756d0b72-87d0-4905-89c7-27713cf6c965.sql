
CREATE OR REPLACE FUNCTION public.sync_connected_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'connected' THEN
    UPDATE public.business_profiles
    SET connected_session_ids = array_append(
      array_remove(COALESCE(connected_session_ids, '{}'::uuid[]), NEW.id),
      NEW.id
    )
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status IN ('disconnected', 'logged_out', 'qr_pending') THEN
    UPDATE public.business_profiles
    SET connected_session_ids = array_remove(COALESCE(connected_session_ids, '{}'::uuid[]), NEW.id)
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_connected_sessions ON public.sessions;
CREATE TRIGGER trg_sync_connected_sessions
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.sync_connected_sessions();
