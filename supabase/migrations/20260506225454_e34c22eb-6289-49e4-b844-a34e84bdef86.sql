CREATE OR REPLACE FUNCTION public.queue_ai_reply_for_pending_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _project_url text := 'https://mjbxpjaxczoycrcjajio.supabase.co';
  _secret text;
BEGIN
  IF NEW.delivery_status IN ('pending', 'processing')
     AND coalesce(NEW.reply_sent, false) = false
     AND coalesce(NEW.message_type, 'text') = 'text'
     AND nullif(NEW.message_text, '') IS NOT NULL THEN
    SELECT ses.webhook_secret
    INTO _secret
    FROM public.sessions ses
    WHERE ses.id = NEW.session_id;

    IF _secret IS NOT NULL THEN
      PERFORM net.http_post(
        url := _project_url || '/functions/v1/ai-reply',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', _secret
        ),
        body := jsonb_build_object(
          'session_id', NEW.session_id,
          'from', NEW.from_number,
          'message', NEW.message_text,
          'is_group', NEW.is_group,
          'message_type', NEW.message_type,
          'source_message_id', NEW.id,
          'raw_payload', NEW.raw_payload
        ),
        timeout_milliseconds := 30000
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_ai_reply_for_pending_message ON public.incoming_messages;
DROP TRIGGER IF EXISTS trg_queue_ai_reply_for_pending_message ON public.incoming_messages;

CREATE TRIGGER queue_ai_reply_for_pending_message
AFTER INSERT OR UPDATE OF delivery_status ON public.incoming_messages
FOR EACH ROW
WHEN (
  NEW.delivery_status IN ('pending', 'processing')
  AND coalesce(NEW.reply_sent, false) = false
  AND coalesce(NEW.message_type, 'text') = 'text'
  AND nullif(NEW.message_text, '') IS NOT NULL
)
EXECUTE FUNCTION public.queue_ai_reply_for_pending_message();

UPDATE public.incoming_messages
SET delivery_status = 'pending',
    reply_error = coalesce(reply_error, 'Re-queued after webhook processor fix')
WHERE delivery_status = 'processing'
  AND coalesce(reply_sent, false) = false;