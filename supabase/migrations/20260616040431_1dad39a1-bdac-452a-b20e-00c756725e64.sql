GRANT SELECT ON public.global_feature_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.global_feature_settings TO authenticated;
GRANT ALL ON public.global_feature_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feature_access TO authenticated;
GRANT ALL ON public.user_feature_access TO service_role;