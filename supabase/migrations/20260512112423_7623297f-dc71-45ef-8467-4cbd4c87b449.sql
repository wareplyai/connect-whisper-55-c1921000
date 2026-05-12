
CREATE OR REPLACE FUNCTION public.lock_features_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['ai_agent','auto_replies','abandoned_cart','ecommerce','products','product_image_match','woocommerce','behavior']
  LOOP
    INSERT INTO public.user_feature_access (user_id, feature, enabled, updated_at)
    VALUES (NEW.id, f, false, now())
    ON CONFLICT (user_id, feature) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_features_for_new_user ON public.profiles;
CREATE TRIGGER trg_lock_features_for_new_user
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.lock_features_for_new_user();
