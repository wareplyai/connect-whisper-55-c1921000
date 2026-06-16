
-- 1) Model pricing table (USD per 1M tokens)
CREATE TABLE IF NOT EXISTS public.ai_model_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  model text NOT NULL,
  input_price_per_1m_usd numeric NOT NULL DEFAULT 0,
  output_price_per_1m_usd numeric NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, model)
);

GRANT SELECT ON public.ai_model_pricing TO authenticated;
GRANT ALL ON public.ai_model_pricing TO service_role;
ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Headadmins manage pricing" ON public.ai_model_pricing
  FOR ALL TO authenticated
  USING (public.is_headadmin(auth.uid()))
  WITH CHECK (public.is_headadmin(auth.uid()));

CREATE POLICY "Authenticated can read pricing" ON public.ai_model_pricing
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_ai_model_pricing_updated
  BEFORE UPDATE ON public.ai_model_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed common models (current public prices, USD per 1M tokens)
INSERT INTO public.ai_model_pricing (platform, model, input_price_per_1m_usd, output_price_per_1m_usd, notes) VALUES
  -- OpenAI
  ('openai','gpt-4o',                 2.50, 10.00, 'GPT-4o'),
  ('openai','gpt-4o-mini',            0.15,  0.60, 'GPT-4o mini'),
  ('openai','gpt-4.1',                2.00,  8.00, 'GPT-4.1'),
  ('openai','gpt-4.1-mini',           0.40,  1.60, 'GPT-4.1 mini'),
  ('openai','gpt-4.1-nano',           0.10,  0.40, 'GPT-4.1 nano'),
  ('openai','gpt-5',                  1.25, 10.00, 'GPT-5'),
  ('openai','gpt-5-mini',             0.25,  2.00, 'GPT-5 mini'),
  ('openai','gpt-5-nano',             0.05,  0.40, 'GPT-5 nano'),
  ('openai','o3-mini',                1.10,  4.40, 'o3-mini'),
  -- Gemini
  ('gemini','gemini-1.5-flash',       0.075, 0.30, 'Gemini 1.5 Flash'),
  ('gemini','gemini-1.5-flash-8b',    0.0375,0.15, 'Gemini 1.5 Flash 8B'),
  ('gemini','gemini-1.5-pro',         1.25,  5.00, 'Gemini 1.5 Pro'),
  ('gemini','gemini-2.0-flash',       0.10,  0.40, 'Gemini 2.0 Flash'),
  ('gemini','gemini-2.5-flash',       0.30,  2.50, 'Gemini 2.5 Flash'),
  ('gemini','gemini-2.5-pro',         1.25, 10.00, 'Gemini 2.5 Pro'),
  -- DeepSeek
  ('deepseek','deepseek-chat',        0.27,  1.10, 'DeepSeek Chat'),
  ('deepseek','deepseek-reasoner',    0.55,  2.19, 'DeepSeek Reasoner')
ON CONFLICT (platform, model) DO NOTHING;

-- 2) Usage logs (per AI reply)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  incoming_message_id uuid,
  from_number text,
  platform text NOT NULL,
  model text NOT NULL,
  key_scope text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  input_price_per_1m_usd numeric NOT NULL DEFAULT 0,
  output_price_per_1m_usd numeric NOT NULL DEFAULT 0,
  input_cost_usd numeric NOT NULL DEFAULT 0,
  output_cost_usd numeric NOT NULL DEFAULT 0,
  total_cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Headadmins read all usage" ON public.ai_usage_logs
  FOR SELECT TO authenticated
  USING (public.is_headadmin(auth.uid()));

CREATE POLICY "Users read own usage" ON public.ai_usage_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_session ON public.ai_usage_logs(session_id, created_at DESC);

-- 3) Updated list RPC: include cost + token totals
DROP FUNCTION IF EXISTS public.headadmin_list_user_usage();
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
      SUM(prompt_tokens)::bigint AS prompt_total,
      SUM(completion_tokens)::bigint AS completion_total,
      SUM(total_cost_usd)::numeric AS cost_total,
      COUNT(*)::bigint AS cnt,
      MAX(created_at) AS last_used_at
    FROM public.ai_usage_logs al
    WHERE al.user_id = p.id
  ) u ON true
  ORDER BY COALESCE(u.cost_total, 0) DESC, COALESCE(s.replies_used, 0) DESC;
END;
$$;

-- 4) Detail breakdown per user
CREATE OR REPLACE FUNCTION public.headadmin_user_usage_detail(_user_id uuid, _limit int DEFAULT 100)
RETURNS TABLE(
  id uuid, created_at timestamptz, session_id uuid,
  session_phone text, from_number text,
  platform text, model text, key_scope text,
  prompt_tokens integer, completion_tokens integer, total_tokens integer,
  total_cost_usd numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_headadmin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT a.id, a.created_at, a.session_id, ses.phone_number, a.from_number,
         a.platform, a.model, a.key_scope,
         a.prompt_tokens, a.completion_tokens, a.total_tokens, a.total_cost_usd
  FROM public.ai_usage_logs a
  LEFT JOIN public.sessions ses ON ses.id = a.session_id
  WHERE a.user_id = _user_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 1000));
END;
$$;

-- 5) Platform-wide totals (for top card)
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
  SELECT platform, model INTO _gk FROM public.ai_api_keys
    WHERE user_id IS NULL AND is_global = true AND is_active = true
    ORDER BY updated_at DESC LIMIT 1;
  RETURN QUERY
  SELECT
    COALESCE(SUM(total_cost_usd), 0)::numeric,
    COALESCE(SUM(total_tokens), 0)::bigint,
    COUNT(*)::bigint,
    COUNT(DISTINCT user_id)::bigint,
    _gk.platform, _gk.model, 'global'::text
  FROM public.ai_usage_logs;
END;
$$;
