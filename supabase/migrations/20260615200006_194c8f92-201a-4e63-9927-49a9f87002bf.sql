
ALTER TABLE public.plan_pricing
  ADD COLUMN IF NOT EXISTS reply_quota integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_max_tokens integer NOT NULL DEFAULT 1000;

UPDATE public.plan_pricing SET reply_quota = 5000,  default_max_tokens = 1000 WHERE plan_name ILIKE 'pro'      AND reply_quota = 0;
UPDATE public.plan_pricing SET reply_quota = 10000, default_max_tokens = 1500 WHERE plan_name ILIKE 'plus'     AND reply_quota = 0;
UPDATE public.plan_pricing SET reply_quota = 20000, default_max_tokens = 2000 WHERE plan_name ILIKE 'business' AND reply_quota = 0;
UPDATE public.plan_pricing SET reply_quota = 100,   default_max_tokens = 500  WHERE plan_name ILIKE 'trial'    AND reply_quota = 0;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS reply_quota integer,
  ADD COLUMN IF NOT EXISTS replies_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS quota_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS max_tokens integer;

UPDATE public.subscriptions
SET quota_period_start = COALESCE(quota_period_start, created_at, now()),
    quota_period_end   = COALESCE(quota_period_end, COALESCE(created_at, now()) + interval '30 days')
WHERE quota_period_start IS NULL OR quota_period_end IS NULL;

ALTER TABLE public.ai_api_keys ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.ai_api_keys ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "headadmin manage global ai keys" ON public.ai_api_keys;
CREATE POLICY "headadmin manage global ai keys"
ON public.ai_api_keys
FOR ALL
TO authenticated
USING (public.is_headadmin(auth.uid()))
WITH CHECK (public.is_headadmin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_user_quota_status(_user_id uuid)
RETURNS TABLE(plan text, reply_quota integer, replies_used integer, remaining integer,
              period_start timestamptz, period_end timestamptz, max_tokens integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _sub record;
  _plan_quota integer;
  _plan_tokens integer;
BEGIN
  SELECT s.* INTO _sub FROM public.subscriptions s
  WHERE s.user_id = _user_id ORDER BY s.created_at DESC LIMIT 1;

  IF _sub.id IS NULL THEN
    RETURN QUERY SELECT 'none'::text, 0, 0, 0, NULL::timestamptz, NULL::timestamptz, 1000;
    RETURN;
  END IF;

  SELECT pp.reply_quota, pp.default_max_tokens INTO _plan_quota, _plan_tokens
  FROM public.plan_pricing pp
  WHERE pp.plan_name = _sub.plan AND pp.is_active = true LIMIT 1;

  _plan_quota  := COALESCE(_sub.reply_quota, _plan_quota, 0);
  _plan_tokens := COALESCE(_sub.max_tokens, _plan_tokens, 1000);

  RETURN QUERY SELECT
    _sub.plan, _plan_quota, COALESCE(_sub.replies_used, 0),
    GREATEST(_plan_quota - COALESCE(_sub.replies_used, 0), 0),
    _sub.quota_period_start, _sub.quota_period_end, _plan_tokens;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_quota_status(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_reply_quota(_user_id uuid)
RETURNS TABLE(allowed boolean, replies_used integer, reply_quota integer, remaining integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _sub record;
  _quota integer;
  _plan_quota integer;
BEGIN
  SELECT * INTO _sub FROM public.subscriptions
  WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF _sub.id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 0; RETURN;
  END IF;

  SELECT pp.reply_quota INTO _plan_quota FROM public.plan_pricing pp
  WHERE pp.plan_name = _sub.plan AND pp.is_active = true LIMIT 1;

  _quota := COALESCE(_sub.reply_quota, _plan_quota, 0);

  IF _sub.quota_period_end IS NULL OR _sub.quota_period_end <= now() THEN
    UPDATE public.subscriptions
    SET replies_used = 0, quota_period_start = now(), quota_period_end = now() + interval '30 days'
    WHERE id = _sub.id RETURNING * INTO _sub;
  END IF;

  IF COALESCE(_sub.replies_used, 0) >= _quota THEN
    RETURN QUERY SELECT false, _sub.replies_used, _quota, 0; RETURN;
  END IF;

  UPDATE public.subscriptions
  SET replies_used = COALESCE(replies_used, 0) + 1
  WHERE id = _sub.id RETURNING * INTO _sub;

  RETURN QUERY SELECT true, _sub.replies_used, _quota, GREATEST(_quota - _sub.replies_used, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_reply_quota(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_ai_api_key(_user_id uuid, _platform text DEFAULT NULL)
RETURNS TABLE(id uuid, platform text, model text, encrypted_key text, scope text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT q.id, q.platform, q.model, q.encrypted_key, q.scope
  FROM (
    (SELECT id, platform, model, encrypted_key, 'user'::text AS scope, 0 AS rank, updated_at
     FROM public.ai_api_keys
     WHERE user_id = _user_id AND is_active = true
       AND (_platform IS NULL OR platform = _platform)
     ORDER BY updated_at DESC LIMIT 1)
    UNION ALL
    (SELECT id, platform, model, encrypted_key, 'global'::text AS scope, 1 AS rank, updated_at
     FROM public.ai_api_keys
     WHERE user_id IS NULL AND is_global = true AND is_active = true
       AND (_platform IS NULL OR platform = _platform)
     ORDER BY updated_at DESC LIMIT 1)
  ) q
  ORDER BY q.rank ASC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_ai_api_key(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_max_tokens(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT max_tokens FROM public.subscriptions WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1),
    (SELECT pp.default_max_tokens FROM public.subscriptions s
       JOIN public.plan_pricing pp ON pp.plan_name = s.plan AND pp.is_active = true
       WHERE s.user_id = _user_id ORDER BY s.created_at DESC LIMIT 1),
    1000
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_user_max_tokens(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.headadmin_list_user_usage()
RETURNS TABLE(user_id uuid, email text, full_name text, plan text,
              reply_quota integer, replies_used integer, remaining integer,
              quota_period_start timestamptz, quota_period_end timestamptz, max_tokens integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_headadmin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, COALESCE(s.plan, 'none')::text,
         COALESCE(s.reply_quota, pp.reply_quota, 0),
         COALESCE(s.replies_used, 0),
         GREATEST(COALESCE(s.reply_quota, pp.reply_quota, 0) - COALESCE(s.replies_used, 0), 0),
         s.quota_period_start, s.quota_period_end,
         COALESCE(s.max_tokens, pp.default_max_tokens, 1000)
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT * FROM public.subscriptions WHERE user_id = p.id ORDER BY created_at DESC LIMIT 1
  ) s ON true
  LEFT JOIN public.plan_pricing pp ON pp.plan_name = s.plan AND pp.is_active = true
  ORDER BY COALESCE(s.replies_used, 0) DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.headadmin_list_user_usage() TO authenticated;
