
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS show_typing_indicator boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_replies_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS ai_show_typing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_read_receipts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_auto_replies_enabled boolean NOT NULL DEFAULT true;
