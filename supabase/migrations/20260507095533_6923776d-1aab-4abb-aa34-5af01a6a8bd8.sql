
-- 1) Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.sms_transactions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.incoming_messages;

-- 2) Drop password_hash from headadmin (rely on Supabase Auth)
ALTER TABLE public.headadmin DROP COLUMN IF EXISTS password_hash;

-- 3) Harden user_roles: explicit restrictive policies for write ops
DROP POLICY IF EXISTS "deny non-admin role writes" ON public.user_roles;

CREATE POLICY "deny non-admin inserts" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "deny non-admin updates" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "deny non-admin deletes" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Lock down SECURITY DEFINER function EXECUTE permissions
REVOKE EXECUTE ON FUNCTION public.expire_own_trial() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_user_trial() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_service(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.latest_session_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_incoming_message_with_match(uuid, text, text, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_auto_reply_for_message(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_auto_reply_delivery(uuid, boolean, text) FROM PUBLIC, anon, authenticated;

-- Trigger-only functions: revoke entirely from API roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_connected_sessions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_auto_reply_session_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_auto_reply_rule_before_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_incoming_message_sender_before_write_disabled() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_ai_reply_for_pending_message() FROM PUBLIC, anon, authenticated;
