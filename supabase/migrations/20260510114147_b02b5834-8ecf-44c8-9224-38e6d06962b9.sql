CREATE TABLE public.image_match_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_phone text,
  query_image_url text,
  matched_product_id uuid,
  matched_product_name text,
  match_distance numeric,
  match_confidence text,
  matched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_match_logs_user_created ON public.image_match_logs (user_id, created_at DESC);
CREATE INDEX idx_image_match_logs_matched_product ON public.image_match_logs (matched_product_id);

ALTER TABLE public.image_match_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own image_match_logs"
ON public.image_match_logs FOR SELECT
USING ((auth.uid() = user_id) OR is_headadmin(auth.uid()));

CREATE POLICY "users delete own image_match_logs"
ON public.image_match_logs FOR DELETE
USING ((auth.uid() = user_id) OR is_headadmin(auth.uid()));

CREATE POLICY "users insert own image_match_logs"
ON public.image_match_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
