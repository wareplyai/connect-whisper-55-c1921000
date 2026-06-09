
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS max_products integer NOT NULL DEFAULT 10;

UPDATE public.profiles SET max_products = 10 WHERE max_products IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_product_image_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _limit integer;
  _count integer;
BEGIN
  SELECT COALESCE(max_products, 10) INTO _limit
  FROM public.profiles WHERE id = NEW.user_id;

  IF _limit IS NULL THEN _limit := 10; END IF;

  SELECT count(*) INTO _count FROM public.product_images WHERE user_id = NEW.user_id;

  IF _count >= _limit THEN
    RAISE EXCEPTION 'Product upload limit reached (% of %). Contact admin to increase.', _count, _limit;
  END IF;
  RETURN NEW;
END;
$function$;
