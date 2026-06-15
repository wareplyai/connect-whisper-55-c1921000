ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;