
-- 1. woo_connections
CREATE TABLE public.woo_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  store_url text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  webhook_secret text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  default_session_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  total_synced integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX woo_connections_webhook_secret_idx ON public.woo_connections(webhook_secret);

ALTER TABLE public.woo_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own woo_connections" ON public.woo_connections
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users insert own woo_connections" ON public.woo_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own woo_connections" ON public.woo_connections
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users delete own woo_connections" ON public.woo_connections
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "headadmin_woo_connections" ON public.woo_connections
  FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE TRIGGER woo_connections_updated_at
  BEFORE UPDATE ON public.woo_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. woo_orders
CREATE TABLE public.woo_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  woo_order_id bigint NOT NULL,
  order_number text,
  status text,
  total numeric,
  currency text,
  customer_name text,
  customer_phone text,
  customer_email text,
  line_items jsonb,
  raw jsonb,
  confirmation_sent boolean NOT NULL DEFAULT false,
  confirmation_sent_at timestamptz,
  confirmation_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, woo_order_id)
);

CREATE INDEX woo_orders_user_created_idx ON public.woo_orders(user_id, created_at DESC);

ALTER TABLE public.woo_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own woo_orders" ON public.woo_orders
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users delete own woo_orders" ON public.woo_orders
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "headadmin_woo_orders" ON public.woo_orders
  FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

-- 3. products extension
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS woo_product_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS products_user_woo_unique
  ON public.products(user_id, woo_product_id)
  WHERE woo_product_id IS NOT NULL;
