
-- Add task_type to ai_usage_logs so we can see which AI tasks consume tokens
ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'text_reply';

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_task
  ON public.ai_usage_logs(user_id, task_type, created_at DESC);

-- Detail RPC: include task_type
DROP FUNCTION IF EXISTS public.headadmin_user_usage_detail(uuid, int);
CREATE OR REPLACE FUNCTION public.headadmin_user_usage_detail(_user_id uuid, _limit int DEFAULT 100)
RETURNS TABLE(
  id uuid, created_at timestamptz, session_id uuid,
  session_phone text, from_number text,
  platform text, model text, key_scope text, task_type text,
  prompt_tokens integer, completion_tokens integer, total_tokens integer,
  total_cost_usd numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_headadmin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT a.id, a.created_at, a.session_id, ses.phone_number, a.from_number,
         a.platform, a.model, a.key_scope, COALESCE(a.task_type, 'text_reply'),
         a.prompt_tokens, a.completion_tokens, a.total_tokens, a.total_cost_usd
  FROM public.ai_usage_logs a
  LEFT JOIN public.sessions ses ON ses.id = a.session_id
  WHERE a.user_id = _user_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 1000));
END;
$$;
GRANT EXECUTE ON FUNCTION public.headadmin_user_usage_detail(uuid, int) TO authenticated;

-- List RPC: include task_breakdown jsonb (and global-only breakdown)
DROP FUNCTION IF EXISTS public.headadmin_list_user_usage();
CREATE OR REPLACE FUNCTION public.headadmin_list_user_usage()
RETURNS TABLE(
  user_id uuid, email text, full_name text, plan text,
  reply_quota integer, replies_used integer, remaining integer,
  quota_period_start timestamptz, quota_period_end timestamptz,
  max_tokens integer, tokens_used bigint,
  prompt_tokens_total bigint, completion_tokens_total bigint,
  total_cost_usd numeric, reply_count bigint,
  last_used_at timestamptz,
  task_breakdown jsonb,
  global_task_breakdown jsonb
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
         u.last_used_at,
         COALESCE(tb.breakdown, '[]'::jsonb),
         COALESCE(gtb.breakdown, '[]'::jsonb)
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
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'task_type', x.task_type,
      'count', x.cnt,
      'total_tokens', x.tokens,
      'total_cost_usd', x.cost
    ) ORDER BY x.cost DESC) AS breakdown
    FROM (
      SELECT COALESCE(al.task_type, 'text_reply') AS task_type,
             COUNT(*)::bigint AS cnt,
             SUM(al.total_tokens)::bigint AS tokens,
             SUM(al.total_cost_usd)::numeric AS cost
      FROM public.ai_usage_logs al
      WHERE al.user_id = p.id
      GROUP BY COALESCE(al.task_type, 'text_reply')
    ) x
  ) tb ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'task_type', x.task_type,
      'count', x.cnt,
      'total_tokens', x.tokens,
      'total_cost_usd', x.cost
    ) ORDER BY x.cost DESC) AS breakdown
    FROM (
      SELECT COALESCE(al.task_type, 'text_reply') AS task_type,
             COUNT(*)::bigint AS cnt,
             SUM(al.total_tokens)::bigint AS tokens,
             SUM(al.total_cost_usd)::numeric AS cost
      FROM public.ai_usage_logs al
      WHERE al.user_id = p.id
        AND al.key_scope = 'global'
      GROUP BY COALESCE(al.task_type, 'text_reply')
    ) x
  ) gtb ON true
  ORDER BY COALESCE(u.cost_total, 0) DESC, COALESCE(s.replies_used, 0) DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.headadmin_list_user_usage() TO authenticated;
