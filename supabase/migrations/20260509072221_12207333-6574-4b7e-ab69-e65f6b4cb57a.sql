-- Phase 4 CRM tables: returns, follow-ups, courier bookings + enable realtime on conversations

CREATE TABLE IF NOT EXISTS public.crm_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  customer_name text,
  customer_phone text,
  reason text,
  photo_url text,
  status text NOT NULL DEFAULT 'requested',
  pickup_tracking_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_crm_returns" ON public.crm_returns FOR SELECT USING (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_insert_crm_returns" ON public.crm_returns FOR INSERT WITH CHECK (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_update_crm_returns" ON public.crm_returns FOR UPDATE USING (auth.uid() = user_id OR is_headadmin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_delete_crm_returns" ON public.crm_returns FOR DELETE USING (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE TRIGGER crm_returns_updated_at BEFORE UPDATE ON public.crm_returns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid,
  conversation_id uuid,
  scheduled_at timestamptz NOT NULL,
  day_offset integer,
  message text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_crm_follow_ups" ON public.crm_follow_ups FOR SELECT USING (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_insert_crm_follow_ups" ON public.crm_follow_ups FOR INSERT WITH CHECK (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_update_crm_follow_ups" ON public.crm_follow_ups FOR UPDATE USING (auth.uid() = user_id OR is_headadmin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_delete_crm_follow_ups" ON public.crm_follow_ups FOR DELETE USING (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE TRIGGER crm_follow_ups_updated_at BEFORE UPDATE ON public.crm_follow_ups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.crm_courier_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  courier text NOT NULL,
  tracking_id text,
  status text NOT NULL DEFAULT 'booked',
  weight numeric DEFAULT 1,
  cod_amount numeric DEFAULT 0,
  notes text,
  raw_response jsonb,
  booked_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_courier_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_crm_courier_bookings" ON public.crm_courier_bookings FOR SELECT USING (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_insert_crm_courier_bookings" ON public.crm_courier_bookings FOR INSERT WITH CHECK (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_update_crm_courier_bookings" ON public.crm_courier_bookings FOR UPDATE USING (auth.uid() = user_id OR is_headadmin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE POLICY "users_delete_crm_courier_bookings" ON public.crm_courier_bookings FOR DELETE USING (auth.uid() = user_id OR is_headadmin(auth.uid()));
CREATE TRIGGER crm_courier_bookings_updated_at BEFORE UPDATE ON public.crm_courier_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime on crm_conversations and crm_messages
ALTER TABLE public.crm_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.crm_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;