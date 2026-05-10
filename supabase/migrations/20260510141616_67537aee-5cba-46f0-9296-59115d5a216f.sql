
CREATE TABLE IF NOT EXISTS public.message_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  from_number text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  first_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_batches_lookup
  ON public.message_batches(session_id, from_number, processed, last_message_at DESC);

ALTER TABLE public.message_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own message_batches" ON public.message_batches
  FOR SELECT USING (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users delete own message_batches" ON public.message_batches
  FOR DELETE USING (auth.uid() = user_id OR is_headadmin(auth.uid()));

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS batch_wait_seconds integer NOT NULL DEFAULT 10;
