
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  product_price text,
  product_description text,
  product_image_url text NOT NULL,
  image_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own product_images" ON public.product_images
FOR SELECT USING ((auth.uid() = user_id) OR is_headadmin(auth.uid()));

CREATE POLICY "users insert own product_images" ON public.product_images
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own product_images" ON public.product_images
FOR UPDATE USING ((auth.uid() = user_id) OR is_headadmin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_headadmin(auth.uid()));

CREATE POLICY "users delete own product_images" ON public.product_images
FOR DELETE USING ((auth.uid() = user_id) OR is_headadmin(auth.uid()));

CREATE INDEX idx_product_images_user ON public.product_images(user_id);

CREATE TRIGGER update_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE OR REPLACE FUNCTION public.enforce_product_image_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.product_images WHERE user_id = NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'Maximum 50 products allowed per user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_product_image_limit_trigger
BEFORE INSERT ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.enforce_product_image_limit();

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "product-images public read" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product-images user upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "product-images user update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "product-images user delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
