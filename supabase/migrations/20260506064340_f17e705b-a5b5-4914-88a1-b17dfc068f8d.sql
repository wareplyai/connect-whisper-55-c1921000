ALTER TABLE public.auto_reply_rules
ADD COLUMN IF NOT EXISTS enabled boolean GENERATED ALWAYS AS (is_active) STORED;

CREATE POLICY "gateway can read active auto reply rules"
ON public.auto_reply_rules
FOR SELECT
TO anon, authenticated
USING (is_active = true);