CREATE OR REPLACE FUNCTION public.consume_reply_quota(_user_id uuid)
RETURNS TABLE(allowed boolean, replies_used integer, reply_quota integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sub public.subscriptions%ROWTYPE;
  _quota integer;
  _plan_quota integer;
BEGIN
  SELECT s.* INTO _sub
  FROM public.subscriptions AS s
  WHERE s.user_id = _user_id
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF _sub.id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 0;
    RETURN;
  END IF;

  SELECT pp.reply_quota INTO _plan_quota
  FROM public.plan_pricing AS pp
  WHERE pp.plan_name = _sub.plan
    AND pp.is_active = true
  LIMIT 1;

  _quota := COALESCE(_sub.reply_quota, _plan_quota, 0);

  IF _sub.quota_period_end IS NULL OR _sub.quota_period_end <= now() THEN
    UPDATE public.subscriptions AS s
    SET replies_used = 0,
        quota_period_start = now(),
        quota_period_end = now() + interval '30 days'
    WHERE s.id = _sub.id
    RETURNING s.* INTO _sub;
  END IF;

  IF _quota <= 0 THEN
    RETURN QUERY SELECT false, COALESCE(_sub.replies_used, 0), _quota, 0;
    RETURN;
  END IF;

  IF COALESCE(_sub.replies_used, 0) >= _quota THEN
    RETURN QUERY SELECT false, COALESCE(_sub.replies_used, 0), _quota, 0;
    RETURN;
  END IF;

  UPDATE public.subscriptions AS s
  SET replies_used = COALESCE(s.replies_used, 0) + 1
  WHERE s.id = _sub.id
  RETURNING s.* INTO _sub;

  RETURN QUERY SELECT true, COALESCE(_sub.replies_used, 0), _quota, GREATEST(_quota - COALESCE(_sub.replies_used, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_reply_quota(uuid) TO service_role;