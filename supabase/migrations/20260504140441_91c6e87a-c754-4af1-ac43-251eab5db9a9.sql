ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;