ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS message_batching_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_profiles.message_batching_enabled IS 'Controls whether AI Agent collects rapid customer messages before replying. Default false keeps safe immediate replies.';