
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tokens_used bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.consume_tokens(_user_id uuid, _tokens integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sub_id uuid;
BEGIN
  IF _tokens IS NULL OR _tokens <= 0 THEN RETURN; END IF;
  SELECT id INTO _sub_id FROM public.subscriptions
    WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;
  IF _sub_id IS NULL THEN RETURN; END IF;
  UPDATE public.subscriptions
    SET tokens_used = COALESCE(tokens_used, 0) + _tokens
    WHERE id = _sub_id;
END;
$$;
