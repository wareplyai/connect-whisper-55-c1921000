CREATE OR REPLACE FUNCTION public.is_internal_ai_reply_url(_url text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(_url, '') ~* '^https://mjbxpjaxczoycrcjajio\.supabase\.co/functions/v1/ai-reply/?$';
$$;

CREATE OR REPLACE FUNCTION public.sync_whatsapp_gateway_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _gateway_url text := 'https://alvi-waapi.duckdns.org';
  _ai_reply_url text := 'https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/ai-reply';
  _events text[];
BEGIN
  IF NEW.id IS NULL THEN
    RETURN NEW;
  END IF;

  _events := coalesce(NEW.webhook_events, ARRAY[]::text[]);
  IF NOT ('messages.received' = ANY(_events)) THEN
    _events := array_append(_events, 'messages.received');
  END IF;

  PERFORM net.http_post(
    url := _gateway_url || '/api/session/create',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'sessionId', NEW.id,
      'webhook_url', _ai_reply_url,
      'webhookUrl', _ai_reply_url,
      'webhook_secret', NEW.webhook_secret,
      'webhookSecret', NEW.webhook_secret,
      'webhook_events', to_jsonb(_events),
      'events', to_jsonb(_events),
      'enable_webhook', true,
      'ignore_groups', NEW.ignore_groups,
      'ignore_broadcasts', NEW.ignore_broadcasts,
      'ignore_channels', NEW.ignore_channels
    ),
    timeout_milliseconds := 15000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_whatsapp_gateway_session ON public.sessions;
CREATE TRIGGER trg_sync_whatsapp_gateway_session
AFTER INSERT OR UPDATE OF webhook_url, webhook_secret, webhook_events, enable_webhook, ignore_groups, ignore_broadcasts, ignore_channels, status
ON public.sessions
FOR EACH ROW
WHEN (NEW.status IN ('qr_pending', 'connected'))
EXECUTE FUNCTION public.sync_whatsapp_gateway_session();

UPDATE public.sessions
SET
  enable_webhook = true,
  webhook_url = 'https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/ai-reply',
  forward_webhook_url = CASE
    WHEN public.is_internal_ai_reply_url(forward_webhook_url) THEN NULL
    ELSE forward_webhook_url
  END,
  webhook_events = CASE
    WHEN 'messages.received' = ANY(coalesce(webhook_events, ARRAY[]::text[])) THEN webhook_events
    ELSE array_append(coalesce(webhook_events, ARRAY[]::text[]), 'messages.received')
  END
WHERE status IN ('qr_pending', 'connected')
  AND (
    enable_webhook IS DISTINCT FROM true
    OR webhook_url IS DISTINCT FROM 'https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/ai-reply'
    OR public.is_internal_ai_reply_url(forward_webhook_url)
    OR NOT ('messages.received' = ANY(coalesce(webhook_events, ARRAY[]::text[])))
  );

DO $$
DECLARE
  _row record;
  _events text[];
  _ai_reply_url text := 'https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/ai-reply';
BEGIN
  FOR _row IN
    SELECT id, webhook_secret, webhook_events, ignore_groups, ignore_broadcasts, ignore_channels
    FROM public.sessions
    WHERE status IN ('qr_pending', 'connected')
  LOOP
    _events := coalesce(_row.webhook_events, ARRAY[]::text[]);
    IF NOT ('messages.received' = ANY(_events)) THEN
      _events := array_append(_events, 'messages.received');
    END IF;

    PERFORM net.http_post(
      url := 'https://alvi-waapi.duckdns.org/api/session/create',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'sessionId', _row.id,
        'webhook_url', _ai_reply_url,
        'webhookUrl', _ai_reply_url,
        'webhook_secret', _row.webhook_secret,
        'webhookSecret', _row.webhook_secret,
        'webhook_events', to_jsonb(_events),
        'events', to_jsonb(_events),
        'enable_webhook', true,
        'ignore_groups', _row.ignore_groups,
        'ignore_broadcasts', _row.ignore_broadcasts,
        'ignore_channels', _row.ignore_channels
      ),
      timeout_milliseconds := 15000
    );
  END LOOP;
END $$;