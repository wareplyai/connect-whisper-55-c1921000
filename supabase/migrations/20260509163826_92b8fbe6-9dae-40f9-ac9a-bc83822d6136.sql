-- 1) Remove sensitive tables from realtime publication to prevent data leakage via realtime broadcasts
ALTER PUBLICATION supabase_realtime DROP TABLE public.sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.message_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.sales;
ALTER PUBLICATION supabase_realtime DROP TABLE public.payment_transactions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.crm_orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.crm_conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.crm_messages;

-- 2) Make chat-media bucket private and tighten read policy to owner-only
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

DROP POLICY IF EXISTS "chat-media public read" ON storage.objects;

CREATE POLICY "chat-media owner read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3) Restrict SECURITY DEFINER functions to authenticated callers only (revoke from anon/public)
REVOKE EXECUTE ON FUNCTION public.is_headadmin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_session_phone_available(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_admin_push() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.queue_crm_customer_bot() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_headadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_session_phone_available(text, uuid) TO authenticated;

-- 4) Add explicit owner-scoped write policies on abandoned_orders to document intent
CREATE POLICY "Users insert own abandoned orders"
ON public.abandoned_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own abandoned orders"
ON public.abandoned_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own abandoned orders"
ON public.abandoned_orders
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);