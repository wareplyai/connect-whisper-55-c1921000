ALTER TABLE public.crm_orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'woocommerce';
CREATE INDEX IF NOT EXISTS idx_crm_orders_source ON public.crm_orders(source);
CREATE INDEX IF NOT EXISTS idx_crm_orders_user_phone ON public.crm_orders(user_id, customer_phone);