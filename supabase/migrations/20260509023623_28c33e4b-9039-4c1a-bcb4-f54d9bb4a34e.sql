
-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "headadmins can insert own push subs"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (public.is_headadmin(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "headadmins can view own push subs"
  ON public.push_subscriptions FOR SELECT
  USING (public.is_headadmin(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "headadmins can delete own push subs"
  ON public.push_subscriptions FOR DELETE
  USING (public.is_headadmin(auth.uid()) AND auth.uid() = user_id);

-- Trigger function: call send-push edge function on key events
CREATE OR REPLACE FUNCTION public.notify_admin_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _project_url text := 'https://mjbxpjaxczoycrcjajio.supabase.co';
  _payload jsonb;
  _name text;
BEGIN
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT' THEN
    _payload := jsonb_build_object(
      'kind', 'registration',
      'title', 'New Registration',
      'body', coalesce(NEW.full_name, NEW.email, 'A new user') || ' just registered',
      'url', '/headadmin/m/notifications'
    );
  ELSIF TG_TABLE_NAME = 'payment_transactions' THEN
    SELECT coalesce(p.full_name, p.email, 'A user') INTO _name
      FROM public.profiles p WHERE p.id = NEW.user_id;
    IF TG_OP = 'INSERT' THEN
      _payload := jsonb_build_object(
        'kind', 'payment',
        'title', 'New Payment Pending',
        'body', coalesce(_name, 'User') || ' sent ৳' || NEW.amount::text || ' (' || NEW.plan || ')',
        'url', '/headadmin/m/payments'
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _payload := jsonb_build_object(
        'kind', 'payment_status',
        'title', 'Payment ' || NEW.status,
        'body', coalesce(_name, 'User') || ' • ৳' || NEW.amount::text,
        'url', '/headadmin/m/payments'
      );
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := _project_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := _payload,
    timeout_milliseconds := 10000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_new_profile ON public.profiles;
CREATE TRIGGER trg_push_new_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_push();

DROP TRIGGER IF EXISTS trg_push_payment_tx ON public.payment_transactions;
CREATE TRIGGER trg_push_payment_tx
  AFTER INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_push();
