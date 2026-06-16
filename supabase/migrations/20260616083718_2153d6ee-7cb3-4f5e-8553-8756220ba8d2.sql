
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS match_image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS match_image_paths text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS real_image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS real_image_paths text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_match_images_max_2;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_real_images_max_2;
ALTER TABLE public.products
  ADD CONSTRAINT products_match_images_max_2 CHECK (coalesce(array_length(match_image_urls,1),0) <= 2),
  ADD CONSTRAINT products_real_images_max_2 CHECK (coalesce(array_length(real_image_urls,1),0) <= 2);
