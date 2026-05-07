
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_service(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_own_trial() TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_user_trial() TO authenticated;
