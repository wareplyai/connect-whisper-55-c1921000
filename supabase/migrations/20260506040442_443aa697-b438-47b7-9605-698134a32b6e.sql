-- Helper function for updated_at (create if missing)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.auto_reply_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  rule_name TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  match_type TEXT NOT NULL DEFAULT 'contains',
  reply_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  match_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_reply_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own auto_reply_rules"
ON public.auto_reply_rules FOR SELECT
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users insert own auto_reply_rules with active service"
ON public.auto_reply_rules FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR ((auth.uid() = user_id) AND has_active_service(auth.uid())));

CREATE POLICY "users update own auto_reply_rules"
ON public.auto_reply_rules FOR UPDATE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users delete own auto_reply_rules"
ON public.auto_reply_rules FOR DELETE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "headadmin_auto_reply_rules"
ON public.auto_reply_rules FOR ALL
USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE TRIGGER set_auto_reply_rules_updated_at
BEFORE UPDATE ON public.auto_reply_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_auto_reply_rules_user ON public.auto_reply_rules(user_id, is_active);
CREATE INDEX idx_auto_reply_rules_session ON public.auto_reply_rules(session_id);

CREATE TABLE public.incoming_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  from_number TEXT NOT NULL,
  message_text TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_group BOOLEAN NOT NULL DEFAULT false,
  matched_rule_id UUID,
  reply_sent BOOLEAN NOT NULL DEFAULT false,
  reply_text TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own incoming_messages"
ON public.incoming_messages FOR SELECT
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "headadmin_incoming_messages"
ON public.incoming_messages FOR ALL
USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE INDEX idx_incoming_messages_session ON public.incoming_messages(session_id, received_at DESC);
CREATE INDEX idx_incoming_messages_user ON public.incoming_messages(user_id, received_at DESC);