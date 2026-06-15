
REVOKE EXECUTE ON FUNCTION public.cleanup_old_data() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_data() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_data() TO service_role;
