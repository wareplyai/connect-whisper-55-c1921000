ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
CREATE INDEX IF NOT EXISTS products_user_sku_idx ON public.products (user_id, lower(sku));