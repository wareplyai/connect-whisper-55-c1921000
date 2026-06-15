
DROP FUNCTION IF EXISTS public.headadmin_list_user_usage();

CREATE OR REPLACE FUNCTION public.headadmin_list_user_usage()
 RETURNS TABLE(user_id uuid, email text, full_name text, plan text, reply_quota integer, replies_used integer, remaining integer, quota_period_start timestamp with time zone, quota_period_end timestamp with time zone, max_tokens integer, tokens_used bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_headadmin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, COALESCE(s.plan, 'none')::text,
         COALESCE(s.reply_quota, pp.reply_quota, 0),
         COALESCE(s.replies_used, 0),
         GREATEST(COALESCE(s.reply_quota, pp.reply_quota, 0) - COALESCE(s.replies_used, 0), 0),
         s.quota_period_start, s.quota_period_end,
         COALESCE(s.max_tokens, pp.default_max_tokens, 1000),
         COALESCE(s.tokens_used, 0)::bigint
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT * FROM public.subscriptions sub WHERE sub.user_id = p.id ORDER BY sub.created_at DESC LIMIT 1
  ) s ON true
  LEFT JOIN public.plan_pricing pp ON pp.plan_name = s.plan AND pp.is_active = true
  ORDER BY COALESCE(s.replies_used, 0) DESC;
END;
$$;
