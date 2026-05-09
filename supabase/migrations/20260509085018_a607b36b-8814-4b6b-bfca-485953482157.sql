CREATE TABLE IF NOT EXISTS public.crm_courier_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  auto_book boolean NOT NULL DEFAULT false,
  default_courier text NOT NULL DEFAULT 'pathao',
  pathao_client_id text,
  pathao_client_secret text,
  pathao_store_id text,
  pathao_enabled boolean NOT NULL DEFAULT false,
  steadfast_api_key text,
  steadfast_secret text,
  steadfast_enabled boolean NOT NULL DEFAULT false,
  redx_api_key text,
  redx_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_courier_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_crm_courier_settings" ON public.crm_courier_settings
  FOR SELECT USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()));
CREATE POLICY "users_insert_crm_courier_settings" ON public.crm_courier_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_headadmin(auth.uid()));
CREATE POLICY "users_update_crm_courier_settings" ON public.crm_courier_settings
  FOR UPDATE USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_headadmin(auth.uid()));
CREATE POLICY "users_delete_crm_courier_settings" ON public.crm_courier_settings
  FOR DELETE USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()));

CREATE TRIGGER trg_crm_courier_settings_updated_at
  BEFORE UPDATE ON public.crm_courier_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();