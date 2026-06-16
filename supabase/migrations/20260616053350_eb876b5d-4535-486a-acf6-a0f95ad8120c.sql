CREATE OR REPLACE FUNCTION public.headadmin_purge_user_usage(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_headadmin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.ai_usage_logs WHERE user_id = _user_id;

  UPDATE public.subscriptions
     SET replies_used = 0,
         quota_period_start = now(),
         quota_period_end = now() + interval '30 days'
   WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.headadmin_purge_user_usage(uuid) TO authenticated;