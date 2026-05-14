
-- Make chat-media bucket private; remove public read; tighten policies to authenticated owners
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

DROP POLICY IF EXISTS "Public read chat-media" ON storage.objects;
DROP POLICY IF EXISTS "chat-media user delete" ON storage.objects;
DROP POLICY IF EXISTS "chat-media user update" ON storage.objects;

CREATE POLICY "chat-media owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-media owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-media' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'chat-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Tighten payment-screenshots SELECT policy to authenticated role only
DROP POLICY IF EXISTS "users view own payment screenshots" ON storage.objects;

CREATE POLICY "users view own payment screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true)
    )
  );
