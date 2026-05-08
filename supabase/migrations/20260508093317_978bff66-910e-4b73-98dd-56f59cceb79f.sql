CREATE OR REPLACE FUNCTION public.sync_whatsapp_gateway_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS trg_sync_whatsapp_gateway_session ON public.sessions;
CREATE TRIGGER trg_sync_whatsapp_gateway_session
AFTER INSERT OR UPDATE OF webhook_secret, webhook_url, webhook_events, enable_webhook, ignore_groups, ignore_broadcasts, ignore_channels, status
ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_whatsapp_gateway_session();

UPDATE public.sessions
SET
  enable_webhook = true,
  webhook_url = 'https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/ai-reply',
  forward_webhook_url = NULL,
  webhook_events = CASE
    WHEN 'messages.received' = ANY(coalesce(webhook_events, ARRAY[]::text[])) THEN webhook_events
    ELSE array_append(coalesce(webhook_events, ARRAY[]::text[]), 'messages.received')
  END
WHERE webhook_url IS DISTINCT FROM 'https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/ai-reply'
   OR forward_webhook_url IS NOT NULL
   OR enable_webhook IS DISTINCT FROM true
   OR NOT ('messages.received' = ANY(coalesce(webhook_events, ARRAY[]::text[])));