-- Per-customer bot conversation state
CREATE TABLE IF NOT EXISTS public.crm_bot_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  flow text NOT NULL,             -- 'return' | 'cod_confirm'
  step text NOT NULL,             -- 'await_order' | 'await_reason' | 'await_photo' | 'await_yesno' | 'done'
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_id uuid,
  return_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone, flow)
);

ALTER TABLE public.crm_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_crm_bot_state" ON public.crm_bot_state
  FOR SELECT USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()));
CREATE POLICY "users_insert_crm_bot_state" ON public.crm_bot_state
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_headadmin(auth.uid()));
CREATE POLICY "users_update_crm_bot_state" ON public.crm_bot_state
  FOR UPDATE USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_headadmin(auth.uid()));
CREATE POLICY "users_delete_crm_bot_state" ON public.crm_bot_state
  FOR DELETE USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()));

CREATE TRIGGER trg_crm_bot_state_updated_at
  BEFORE UPDATE ON public.crm_bot_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: forward every incoming message to the CRM customer bot
CREATE OR REPLACE FUNCTION public.queue_crm_customer_bot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _project_url text := 'https://mjbxpjaxczoycrcjajio.supabase.co';
BEGIN
  IF coalesce(NEW.is_group, false) = true THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := _project_url || '/functions/v1/crm-customer-bot',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'user_id', NEW.user_id,
      'session_id', NEW.session_id,
      'from', NEW.from_number,
      'text', NEW.message_text,
      'message_type', NEW.message_type,
      'image_url', NEW.image_url
    ),
    timeout_milliseconds := 15000
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_crm_customer_bot ON public.incoming_messages;
CREATE TRIGGER trg_queue_crm_customer_bot
  AFTER INSERT ON public.incoming_messages
  FOR EACH ROW EXECUTE FUNCTION public.queue_crm_customer_bot();