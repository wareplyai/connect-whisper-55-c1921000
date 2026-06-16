CREATE OR REPLACE FUNCTION public.headadmin_list_user_usage()
RETURNS TABLE(
  user_id uuid, email text, full_name text, plan text,
  reply_quota integer, replies_used integer, remaining integer,
  quota_period_start timestamptz, quota_period_end timestamptz,
  max_tokens integer, tokens_used bigint,
  prompt_tokens_total bigint, completion_tokens_total bigint,
  total_cost_usd numeric, reply_count bigint,
  last_used_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
         COALESCE(s.tokens_used, 0)::bigint,
         COALESCE(u.prompt_total, 0)::bigint,
         COALESCE(u.completion_total, 0)::bigint,
         COALESCE(u.cost_total, 0)::numeric,
         COALESCE(u.cnt, 0)::bigint,
         u.last_used_at
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT * FROM public.subscriptions sub WHERE sub.user_id = p.id ORDER BY sub.created_at DESC LIMIT 1
  ) s ON true
  LEFT JOIN public.plan_pricing pp ON pp.plan_name = s.plan AND pp.is_active = true
  LEFT JOIN LATERAL (
    SELECT
      SUM(al.prompt_tokens)::bigint AS prompt_total,
      SUM(al.completion_tokens)::bigint AS completion_total,
      SUM(al.total_cost_usd)::numeric AS cost_total,
      COUNT(*)::bigint AS cnt,
      MAX(al.created_at) AS last_used_at
    FROM public.ai_usage_logs al
    WHERE al.user_id = p.id
  ) u ON true
  ORDER BY COALESCE(u.cost_total, 0) DESC, COALESCE(s.replies_used, 0) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.headadmin_usage_totals()
RETURNS TABLE(
  total_cost_usd numeric, total_tokens bigint, total_replies bigint,
  active_users bigint, active_platform text, active_model text, active_scope text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _gk record;
BEGIN
  IF NOT public.is_headadmin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT k.platform, k.model INTO _gk FROM public.ai_api_keys k
    WHERE k.user_id IS NULL AND k.is_global = true AND k.is_active = true
    ORDER BY k.updated_at DESC LIMIT 1;
  RETURN QUERY
  SELECT
    COALESCE(SUM(al.total_cost_usd), 0)::numeric,
    COALESCE(SUM(al.total_tokens), 0)::bigint,
    COUNT(*)::bigint,
    COUNT(DISTINCT al.user_id)::bigint,
    _gk.platform, _gk.model, 'global'::text
  FROM public.ai_usage_logs al;
END;
$$;

GRANT EXECUTE ON FUNCTION public.headadmin_list_user_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.headadmin_usage_totals() TO authenticated;