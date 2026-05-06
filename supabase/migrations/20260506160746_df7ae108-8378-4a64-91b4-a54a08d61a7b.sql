
CREATE TABLE public.behavior_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  fifo_enabled boolean NOT NULL DEFAULT true,
  typing_simulation boolean NOT NULL DEFAULT true,
  typing_min_ms integer NOT NULL DEFAULT 1500,
  typing_max_ms integer NOT NULL DEFAULT 4500,
  read_delay_min_ms integer NOT NULL DEFAULT 800,
  read_delay_max_ms integer NOT NULL DEFAULT 2500,
  reply_delay_min_ms integer NOT NULL DEFAULT 2000,
  reply_delay_max_ms integer NOT NULL DEFAULT 6000,
  max_replies_per_minute integer NOT NULL DEFAULT 10,
  max_replies_per_hour integer NOT NULL DEFAULT 200,
  auto_pause_threshold integer NOT NULL DEFAULT 50,
  working_hours_enabled boolean NOT NULL DEFAULT false,
  working_hours_start text NOT NULL DEFAULT '09:00',
  working_hours_end text NOT NULL DEFAULT '22:00',
  timezone text NOT NULL DEFAULT 'Asia/Dhaka',
  reply_only_first_in_burst boolean NOT NULL DEFAULT false,
  random_variation boolean NOT NULL DEFAULT true,
  online_presence boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_id)
);
CREATE INDEX idx_behavior_settings_user ON public.behavior_settings(user_id);

ALTER TABLE public.behavior_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own behavior_settings" ON public.behavior_settings
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own behavior_settings" ON public.behavior_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own behavior_settings" ON public.behavior_settings
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users delete own behavior_settings" ON public.behavior_settings
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "headadmin_behavior_settings" ON public.behavior_settings
  FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE TRIGGER trg_behavior_settings_updated_at
  BEFORE UPDATE ON public.behavior_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
