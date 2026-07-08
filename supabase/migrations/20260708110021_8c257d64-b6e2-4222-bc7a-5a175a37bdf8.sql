
CREATE TABLE public.customer_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC,
  total_price NUMERIC,
  address TEXT,
  notes TEXT,
  raw_summary TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'ai_agent',
  source_message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_orders TO authenticated;
GRANT ALL ON public.customer_orders TO service_role;

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customer orders" ON public.customer_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customer orders" ON public.customer_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customer orders" ON public.customer_orders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own customer orders" ON public.customer_orders
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages customer orders" ON public.customer_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_customer_orders_user_created ON public.customer_orders(user_id, created_at DESC);
CREATE INDEX idx_customer_orders_status ON public.customer_orders(user_id, status);
CREATE INDEX idx_customer_orders_phone ON public.customer_orders(user_id, customer_phone);

CREATE TRIGGER trg_customer_orders_updated_at
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_orders;
