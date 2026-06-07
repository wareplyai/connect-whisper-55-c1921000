
-- Drop CRM/Woo trigger function if exists
DROP FUNCTION IF EXISTS public.queue_crm_customer_bot() CASCADE;

-- Drop tables (CASCADE to remove dependent triggers/policies/grants)
DROP TABLE IF EXISTS public.crm_messages CASCADE;
DROP TABLE IF EXISTS public.crm_conversations CASCADE;
DROP TABLE IF EXISTS public.crm_follow_ups CASCADE;
DROP TABLE IF EXISTS public.crm_returns CASCADE;
DROP TABLE IF EXISTS public.crm_courier_bookings CASCADE;
DROP TABLE IF EXISTS public.crm_courier_settings CASCADE;
DROP TABLE IF EXISTS public.crm_bot_state CASCADE;
DROP TABLE IF EXISTS public.crm_orders CASCADE;
DROP TABLE IF EXISTS public.crm_leads CASCADE;
DROP TABLE IF EXISTS public.woo_orders CASCADE;
DROP TABLE IF EXISTS public.woo_connections CASCADE;
DROP TABLE IF EXISTS public.image_match_logs CASCADE;

-- Clean feature flags for removed sections
DELETE FROM public.global_feature_settings WHERE feature IN ('ecommerce','product_image_match','woocommerce');
DELETE FROM public.user_feature_access WHERE feature IN ('ecommerce','product_image_match','woocommerce');

-- Update lock_features_for_new_user
CREATE OR REPLACE FUNCTION public.lock_features_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['ai_agent','auto_replies','abandoned_cart','products','behavior']
  LOOP
    INSERT INTO public.user_feature_access (user_id, feature, enabled, updated_at)
    VALUES (NEW.id, f, false, now())
    ON CONFLICT (user_id, feature) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$function$;
