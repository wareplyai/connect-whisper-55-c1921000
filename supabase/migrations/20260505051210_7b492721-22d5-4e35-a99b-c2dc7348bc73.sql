
-- Table 1: sms_transactions
CREATE TABLE public.sms_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text,
  message text NOT NULL,
  transaction_id text UNIQUE NOT NULL,
  amount numeric,
  payment_method text,
  is_used boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_transactions_txid ON public.sms_transactions(transaction_id);
CREATE INDEX idx_sms_transactions_is_used ON public.sms_transactions(is_used);

ALTER TABLE public.sms_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "headadmin_sms_transactions"
ON public.sms_transactions
FOR ALL
USING (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true))
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

-- Table 2: orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  product_id text,
  product_name text,
  buyer_email text,
  buyer_phone text,
  amount numeric NOT NULL,
  transaction_id text,
  status text NOT NULL DEFAULT 'pending',
  download_url text,
  payment_method text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX idx_orders_order_id ON public.orders(order_id);
CREATE INDEX idx_orders_txid ON public.orders(transaction_id);
CREATE INDEX idx_orders_status ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "headadmin_orders"
ON public.orders
FOR ALL
USING (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true))
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

-- Allow buyers (anon) to read their own order via order_id (needed for realtime status polling)
CREATE POLICY "public_read_orders_by_id"
ON public.orders
FOR SELECT
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.sms_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
