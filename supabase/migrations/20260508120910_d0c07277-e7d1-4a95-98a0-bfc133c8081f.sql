
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.abandoned_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  webhook_secret TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  default_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  country_code TEXT NOT NULL DEFAULT '88',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_received INTEGER NOT NULL DEFAULT 0,
  total_incomplete INTEGER NOT NULL DEFAULT 0,
  total_completed INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abandoned_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own abandoned conn" ON public.abandoned_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER abandoned_connections_updated
  BEFORE UPDATE ON public.abandoned_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TABLE IF NOT EXISTS public.abandoned_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_phone_full TEXT,
  customer_address TEXT,
  product_name TEXT,
  product_link TEXT,
  order_date TEXT,
  site_name TEXT,
  site_url TEXT,
  whatsapp_message TEXT,
  raw JSONB,
  sms_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sms_sent_at TIMESTAMPTZ,
  sms_error TEXT,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abandoned_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own abandoned orders" ON public.abandoned_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_abandoned_orders_user_created
  ON public.abandoned_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandoned_orders_status
  ON public.abandoned_orders (user_id, status, created_at DESC);
