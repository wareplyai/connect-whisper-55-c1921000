
-- Add user_id column to webhook_logs for direct ownership scoping
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill from sessions
UPDATE public.webhook_logs wl
SET user_id = s.user_id
FROM public.sessions s
WHERE wl.session_id = s.id AND wl.user_id IS NULL;

-- Make non-null going forward
ALTER TABLE public.webhook_logs ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON public.webhook_logs(user_id);

-- Replace SELECT policy to scope directly on user_id
DROP POLICY IF EXISTS "users view own webhook_logs" ON public.webhook_logs;

CREATE POLICY "users view own webhook_logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
