
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.incoming_messages WHERE received_at < now() - interval '30 days';
  DELETE FROM public.message_logs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.webhook_logs WHERE created_at < now() - interval '7 days';
  DELETE FROM public.activity_logs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.sms_transactions WHERE received_at < now() - interval '90 days';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_data() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-data-daily') THEN
    PERFORM cron.unschedule('cleanup-old-data-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-old-data-daily',
  '30 3 * * *',
  $$ SELECT public.cleanup_old_data(); $$
);

CREATE INDEX IF NOT EXISTS idx_message_logs_user_created
  ON public.message_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created
  ON public.webhook_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created
  ON public.activity_logs (created_at DESC);
