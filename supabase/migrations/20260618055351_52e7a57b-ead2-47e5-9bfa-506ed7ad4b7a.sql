-- Track which API key each AI usage row was charged against
ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS api_key_id uuid REFERENCES public.ai_api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_api_key_id ON public.ai_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_key_scope_created ON public.ai_usage_logs(key_scope, created_at DESC);

-- Token quota alert: notify headadmin when user crosses 80% / 100% of monthly_token_cap
CREATE OR REPLACE FUNCTION public.check_user_token_quota_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cap bigint;
  _used bigint;
  _pct numeric;
  _user_name text;
  _level text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  SELECT monthly_token_cap INTO _cap
  FROM public.user_ai_limits WHERE user_id = NEW.user_id;
  IF _cap IS NULL OR _cap <= 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(total_tokens), 0) INTO _used
  FROM public.ai_usage_logs
  WHERE user_id = NEW.user_id
    AND created_at >= date_trunc('month', now());

  _pct := (_used::numeric / _cap::numeric) * 100;
  IF _pct >= 100 THEN _level := '100';
  ELSIF _pct >= 80 THEN _level := '80';
  ELSE RETURN NEW;
  END IF;

  -- Dedupe: only one alert per user per threshold per calendar month
  IF EXISTS (
    SELECT 1 FROM public.admin_notifications
    WHERE type = 'quota_alert'
      AND target_user_id = NEW.user_id
      AND created_at >= date_trunc('month', now())
      AND title LIKE '%' || _level || '%'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email) INTO _user_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.admin_notifications (title, message, type, target, target_user_id, is_active)
  VALUES (
    'Token quota ' || _level || '% reached',
    COALESCE(_user_name, 'User') || ' has used ' || _used || ' of ' || _cap
      || ' tokens this month (' || round(_pct, 1) || '%).',
    CASE WHEN _level = '100' THEN 'danger' ELSE 'warning' END,
    'headadmin',
    NEW.user_id,
    true
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'check_user_token_quota_alert failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_usage_logs_quota_alert ON public.ai_usage_logs;
CREATE TRIGGER trg_ai_usage_logs_quota_alert
AFTER INSERT ON public.ai_usage_logs
FOR EACH ROW
EXECUTE FUNCTION public.check_user_token_quota_alert();