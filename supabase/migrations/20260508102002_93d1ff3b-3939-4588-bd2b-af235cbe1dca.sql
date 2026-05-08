
-- 1) Remove sensitive tables from supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_logs') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.message_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'incoming_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.incoming_messages';
  END IF;
END $$;

-- 2) Realtime messages RLS — restrict subscriptions to per-user topics
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated subscribe own topic" ON realtime.messages;
CREATE POLICY "authenticated subscribe own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IS NOT NULL
  AND realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
);

-- 3) blocked_customers: add UPDATE policy
DROP POLICY IF EXISTS "users update own blocked_customers" ON public.blocked_customers;
CREATE POLICY "users update own blocked_customers"
ON public.blocked_customers
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- 4) webhook_logs: deny INSERT/UPDATE/DELETE to anon/authenticated
--    (writes happen via service_role only, which bypasses RLS)
DROP POLICY IF EXISTS "deny webhook_logs insert" ON public.webhook_logs;
CREATE POLICY "deny webhook_logs insert"
ON public.webhook_logs AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "deny webhook_logs update" ON public.webhook_logs;
CREATE POLICY "deny webhook_logs update"
ON public.webhook_logs AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "deny webhook_logs delete" ON public.webhook_logs;
CREATE POLICY "deny webhook_logs delete"
ON public.webhook_logs AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- 5) Revoke EXECUTE on SECURITY DEFINER functions from PUBLIC and anon;
--    grant only to authenticated/service_role where needed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- For internal-only functions called by triggers / edge functions only,
-- additionally remove from authenticated:
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_connected_sessions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_auto_reply_session_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_auto_reply_rule_before_write() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_ai_reply_for_pending_message() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_incoming_message_sender_before_write_disabled() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_whatsapp_gateway_session() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;

-- 6) Storage: restrict product-images public bucket listing.
--    Keep public READ of individual files (by exact name), but prevent listing.
DROP POLICY IF EXISTS "Public can read product-images" ON storage.objects;
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Allow authenticated owners to manage their own files
DROP POLICY IF EXISTS "users upload own product-images" ON storage.objects;
CREATE POLICY "users upload own product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "users update own product-images" ON storage.objects;
CREATE POLICY "users update own product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "users delete own product-images" ON storage.objects;
CREATE POLICY "users delete own product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Owners can list/select their own folder
DROP POLICY IF EXISTS "users list own product-images" ON storage.objects;
CREATE POLICY "users list own product-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Note: product-images files are still publicly fetchable via their direct
-- public URL (bucket is public), but anonymous LIST queries on storage.objects
-- are now blocked because no public SELECT policy exists.
