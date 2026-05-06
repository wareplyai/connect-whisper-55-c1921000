ALTER TABLE public.incoming_messages
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reply_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_error text;

CREATE INDEX IF NOT EXISTS idx_incoming_messages_delivery_status
  ON public.incoming_messages(session_id, delivery_status, received_at DESC);

CREATE OR REPLACE FUNCTION public.mark_auto_reply_delivery(
  p_message_id uuid,
  p_sent boolean,
  p_error text DEFAULT NULL
)
RETURNS public.incoming_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.incoming_messages;
BEGIN
  UPDATE public.incoming_messages
  SET
    reply_sent = coalesce(p_sent, false),
    delivery_status = CASE WHEN coalesce(p_sent, false) THEN 'sent' ELSE 'failed' END,
    reply_attempted_at = now(),
    reply_sent_at = CASE WHEN coalesce(p_sent, false) THEN now() ELSE reply_sent_at END,
    reply_error = CASE WHEN coalesce(p_sent, false) THEN NULL ELSE nullif(p_error, '') END,
    processed_at = coalesce(processed_at, now())
  WHERE id = p_message_id
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'incoming message % not found', p_message_id;
  END IF;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_auto_reply_delivery(uuid, boolean, text)
  TO service_role;