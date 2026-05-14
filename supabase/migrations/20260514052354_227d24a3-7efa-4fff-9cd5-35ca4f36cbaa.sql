UPDATE storage.buckets SET public = true WHERE id = 'chat-media';

-- Allow public read access to chat-media files
DO $$ BEGIN
  CREATE POLICY "Public read chat-media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;