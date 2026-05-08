-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  category text,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  image_path text,
  ai_tags text,
  ai_tags_status text NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_user ON public.products(user_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own products" ON public.products FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users insert own products" ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own products" ON public.products FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users delete own products" ON public.products FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "headadmin_products" ON public.products FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Product images are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Users can upload own product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Pending customer image queries (for admin notification when no match)
CREATE TABLE public.unmatched_image_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  from_number text NOT NULL,
  image_url text,
  image_description text,
  best_match_score numeric,
  notified boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unmatched_image_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own unmatched" ON public.unmatched_image_queries FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users update own unmatched" ON public.unmatched_image_queries FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "users delete own unmatched" ON public.unmatched_image_queries FOR DELETE
  USING (auth.uid() = user_id);
