CREATE TABLE IF NOT EXISTS public.blocked_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  phone_number text NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, phone_number)
);

ALTER TABLE public.blocked_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own blocked_customers"
ON public.blocked_customers FOR SELECT
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users insert own blocked_customers"
ON public.blocked_customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own blocked_customers"
ON public.blocked_customers FOR DELETE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "headadmin_blocked_customers"
ON public.blocked_customers FOR ALL
USING (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true))
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

CREATE INDEX IF NOT EXISTS idx_blocked_customers_session ON public.blocked_customers(session_id, phone_number);

ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_messages;
ALTER TABLE public.incoming_messages REPLICA IDENTITY FULL;