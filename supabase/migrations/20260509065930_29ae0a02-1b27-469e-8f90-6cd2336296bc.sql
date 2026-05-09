
-- CRM Phase 1 tables (prefixed with crm_ to avoid conflict with existing 'orders' table)

CREATE TABLE public.crm_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  woo_order_id text,
  customer_name text,
  customer_phone text,
  customer_address text,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'COD',
  order_status text NOT NULL DEFAULT 'pending',
  courier_name text,
  tracking_id text,
  courier_status text,
  cod_confirmed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_orders_user ON public.crm_orders(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_crm_orders_woo ON public.crm_orders(user_id, woo_order_id) WHERE woo_order_id IS NOT NULL;

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text,
  phone text,
  source text DEFAULT 'whatsapp',
  business_type text,
  intent text,
  budget text,
  travel_date text,
  group_size text,
  status text NOT NULL DEFAULT 'new',
  assigned_agent text,
  notes text,
  follow_up_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_leads_user ON public.crm_leads(user_id, status, created_at DESC);

CREATE TABLE public.crm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  customer_name text,
  last_message text,
  last_message_time timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'bot',
  assigned_agent text,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.crm_orders(id) ON DELETE SET NULL,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_conv_user ON public.crm_conversations(user_id, last_message_time DESC);
CREATE UNIQUE INDEX idx_crm_conv_phone ON public.crm_conversations(user_id, phone);

CREATE TABLE public.crm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'customer',
  message_text text,
  message_type text NOT NULL DEFAULT 'text',
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_msg_conv ON public.crm_messages(conversation_id, created_at);

-- Enable RLS
ALTER TABLE public.crm_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

-- Policies: user owns rows, headadmin sees all
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_orders','crm_leads','crm_conversations','crm_messages'] LOOP
    EXECUTE format('CREATE POLICY "users_select_%1$s" ON public.%1$s FOR SELECT USING (auth.uid() = user_id OR is_headadmin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "users_insert_%1$s" ON public.%1$s FOR INSERT WITH CHECK (auth.uid() = user_id OR is_headadmin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "users_update_%1$s" ON public.%1$s FOR UPDATE USING (auth.uid() = user_id OR is_headadmin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_headadmin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "users_delete_%1$s" ON public.%1$s FOR DELETE USING (auth.uid() = user_id OR is_headadmin(auth.uid()))', t);
  END LOOP;
END $$;

-- updated_at triggers
CREATE TRIGGER trg_crm_orders_updated BEFORE UPDATE ON public.crm_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_leads_updated BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
