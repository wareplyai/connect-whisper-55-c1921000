
CREATE TABLE IF NOT EXISTS public.user_ai_limits (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  monthly_token_cap bigint NOT NULL DEFAULT 0,
  monthly_cost_cap_usd numeric(12,4) NOT NULL DEFAULT 0,
  disabled_tasks text[] NOT NULL DEFAULT ARRAY[]::text[],
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_limits TO authenticated;
GRANT ALL ON public.user_ai_limits TO service_role;

ALTER TABLE public.user_ai_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Headadmin manages ai limits"
  ON public.user_ai_limits FOR ALL TO authenticated
  USING (public.is_headadmin(auth.uid()))
  WITH CHECK (public.is_headadmin(auth.uid()));

CREATE TRIGGER trg_user_ai_limits_updated_at
  BEFORE UPDATE ON public.user_ai_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Check whether a user is allowed to perform an AI task right now
CREATE OR REPLACE FUNCTION public.check_user_ai_limit(_user_id uuid, _task_type text)
RETURNS TABLE(
  allowed boolean,
  reason text,
  tokens_used bigint,
  cost_used numeric,
  token_cap bigint,
  cost_cap numeric,
  task_disabled boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _lim public.user_ai_limits;
  _tokens bigint := 0;
  _cost numeric := 0;
  _month_start timestamptz := date_trunc('month', now());
BEGIN
  SELECT * INTO _lim FROM public.user_ai_limits WHERE user_id = _user_id;

  IF _lim.user_id IS NULL THEN
    RETURN QUERY SELECT true, 'no_limit_configured'::text, 0::bigint, 0::numeric, 0::bigint, 0::numeric, false;
    RETURN;
  END IF;

  IF _task_type IS NOT NULL AND _task_type = ANY(_lim.disabled_tasks) THEN
    RETURN QUERY SELECT false, ('task_disabled:' || _task_type)::text, 0::bigint, 0::numeric,
                        _lim.monthly_token_cap, _lim.monthly_cost_cap_usd, true;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(total_tokens), 0), COALESCE(SUM(total_cost_usd), 0)
    INTO _tokens, _cost
    FROM public.ai_usage_logs
    WHERE user_id = _user_id AND created_at >= _month_start;

  IF _lim.monthly_token_cap > 0 AND _tokens >= _lim.monthly_token_cap THEN
    RETURN QUERY SELECT false, 'token_cap_reached'::text, _tokens, _cost,
                        _lim.monthly_token_cap, _lim.monthly_cost_cap_usd, false;
    RETURN;
  END IF;

  IF _lim.monthly_cost_cap_usd > 0 AND _cost >= _lim.monthly_cost_cap_usd THEN
    RETURN QUERY SELECT false, 'cost_cap_reached'::text, _tokens, _cost,
                        _lim.monthly_token_cap, _lim.monthly_cost_cap_usd, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'ok'::text, _tokens, _cost,
                      _lim.monthly_token_cap, _lim.monthly_cost_cap_usd, false;
END;
$$;

-- Head-admin AI spend summary for the dashboard card
CREATE OR REPLACE FUNCTION public.headadmin_ai_spend_summary()
RETURNS TABLE(
  this_month_tokens bigint,
  this_month_cost numeric,
  last_month_cost numeric,
  active_users_this_month integer,
  top_users jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _this_start timestamptz := date_trunc('month', now());
  _last_start timestamptz := date_trunc('month', now() - interval '1 month');
  _last_end timestamptz := date_trunc('month', now());
BEGIN
  IF NOT public.is_headadmin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH this_m AS (
    SELECT user_id, SUM(total_tokens)::bigint AS tok, SUM(total_cost_usd)::numeric AS cost
    FROM public.ai_usage_logs
    WHERE created_at >= _this_start
    GROUP BY user_id
  ),
  last_m AS (
    SELECT SUM(total_cost_usd)::numeric AS cost
    FROM public.ai_usage_logs
    WHERE created_at >= _last_start AND created_at < _last_end
  ),
  top5 AS (
    SELECT tm.user_id, p.email, p.full_name, tm.tok, tm.cost
    FROM this_m tm
    LEFT JOIN public.profiles p ON p.id = tm.user_id
    ORDER BY tm.cost DESC NULLS LAST
    LIMIT 5
  )
  SELECT
    COALESCE((SELECT SUM(tok) FROM this_m), 0)::bigint,
    COALESCE((SELECT SUM(cost) FROM this_m), 0)::numeric,
    COALESCE((SELECT cost FROM last_m), 0)::numeric,
    COALESCE((SELECT COUNT(*)::int FROM this_m), 0),
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'user_id', user_id, 'email', email, 'full_name', full_name,
      'tokens', tok, 'cost_usd', cost
    )) FROM top5), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_ai_limit(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.headadmin_ai_spend_summary() TO authenticated, service_role;
