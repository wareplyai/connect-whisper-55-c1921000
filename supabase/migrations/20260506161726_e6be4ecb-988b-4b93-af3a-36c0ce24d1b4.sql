
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connected_session_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
