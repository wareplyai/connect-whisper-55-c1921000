-- Make profile-insert side-triggers non-fatal so signup never breaks
-- 1) notify_admin_push: never raise (push is best-effort)
CREATE OR REPLACE FUNCTION public.notify_admin_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net'
AS $function$
DECLARE
  _project_url text := 'https://mjbxpjaxczoycrcjajio.supabase.co';
  _payload jsonb;
  _name text;
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Never block the underlying insert/update because push notification failed
    RAISE WARNING 'notify_admin_push failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

-- 2) lock_features_for_new_user: also make non-fatal
CREATE OR REPLACE FUNCTION public.lock_features_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  f text;
BEGIN
  BEGIN
    FOREACH f IN ARRAY ARRAY['ai_agent','auto_replies','abandoned_cart','products','behavior']
    LOOP
      INSERT INTO public.user_feature_access (user_id, feature, enabled, updated_at)
      VALUES (NEW.id, f, false, now())
      ON CONFLICT (user_id, feature) DO NOTHING;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'lock_features_for_new_user failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

-- 3) Also harden handle_new_user itself so neither the role insert nor anything else can break signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, approval_status)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'pending')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert failed: %', SQLERRM;
  END;
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user role insert failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;