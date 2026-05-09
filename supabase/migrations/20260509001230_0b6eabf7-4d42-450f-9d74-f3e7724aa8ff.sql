
CREATE OR REPLACE FUNCTION public.is_headadmin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.headadmin WHERE auth_user_id = _uid AND is_active = true)
$$;

DROP POLICY IF EXISTS "headadmin read all sessions" ON public.sessions;
CREATE POLICY "headadmin read all sessions" ON public.sessions FOR SELECT USING (public.is_headadmin(auth.uid()));

DROP POLICY IF EXISTS "headadmin read all message_logs" ON public.message_logs;
CREATE POLICY "headadmin read all message_logs" ON public.message_logs FOR SELECT USING (public.is_headadmin(auth.uid()));

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sales; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
