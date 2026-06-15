ALTER TABLE public.customer_reply_settings REPLICA IDENTITY FULL;
ALTER TABLE public.incoming_messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_logs REPLICA IDENTITY FULL;
ALTER TABLE public.blocked_customers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_reply_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_customers;