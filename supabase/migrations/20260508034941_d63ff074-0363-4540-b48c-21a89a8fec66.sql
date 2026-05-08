DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'incoming_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'message_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_logs;
  END IF;
END $$;