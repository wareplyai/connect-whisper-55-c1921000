-- Ensure chat-media bucket exists and public thumbnail URLs can be read
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "chat-media public read" ON storage.objects;
DROP POLICY IF EXISTS "chat-media user upload" ON storage.objects;
DROP POLICY IF EXISTS "chat-media user update" ON storage.objects;
DROP POLICY IF EXISTS "chat-media user delete" ON storage.objects;

CREATE POLICY "chat-media public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "chat-media user upload"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-media user update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-media user delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Structured media fields on incoming customer messages
ALTER TABLE public.incoming_messages
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS mimetype text,
  ADD COLUMN IF NOT EXISTS image_caption text,
  ADD COLUMN IF NOT EXISTS extracted_product_name text,
  ADD COLUMN IF NOT EXISTS extracted_order_number text,
  ADD COLUMN IF NOT EXISTS image_analysis jsonb,
  ADD COLUMN IF NOT EXISTS image_analyzed_at timestamptz;

-- Structured media fields on message logs for traceability
ALTER TABLE public.message_logs
  ADD COLUMN IF NOT EXISTS incoming_message_id uuid REFERENCES public.incoming_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS mimetype text,
  ADD COLUMN IF NOT EXISTS image_caption text,
  ADD COLUMN IF NOT EXISTS extracted_product_name text,
  ADD COLUMN IF NOT EXISTS extracted_order_number text,
  ADD COLUMN IF NOT EXISTS image_analysis jsonb;

CREATE INDEX IF NOT EXISTS idx_incoming_messages_image_url
  ON public.incoming_messages(user_id, received_at DESC)
  WHERE image_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incoming_messages_extracted_order_number
  ON public.incoming_messages(user_id, extracted_order_number)
  WHERE extracted_order_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_logs_incoming_message_id
  ON public.message_logs(incoming_message_id)
  WHERE incoming_message_id IS NOT NULL;