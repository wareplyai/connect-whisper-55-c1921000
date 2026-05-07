ALTER TABLE public.customer_reply_settings
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'ai';

ALTER TABLE public.customer_reply_settings
  DROP CONSTRAINT IF EXISTS customer_reply_settings_mode_check;

ALTER TABLE public.customer_reply_settings
  ADD CONSTRAINT customer_reply_settings_mode_check
  CHECK (mode IN ('ai', 'human', 'auto_reply'));

UPDATE public.customer_reply_settings SET mode = 'human' WHERE ai_paused = true AND mode = 'ai';