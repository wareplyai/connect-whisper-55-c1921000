
CREATE TABLE IF NOT EXISTS public.ai_task_limits (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  vision_detail text NOT NULL DEFAULT 'low' CHECK (vision_detail IN ('low','high','auto')),
  image_describe_max_tokens integer NOT NULL DEFAULT 150,
  image_extract_max_tokens integer NOT NULL DEFAULT 150,
  vision_match_max_tokens integer NOT NULL DEFAULT 100,
  vision_match_max_candidates integer NOT NULL DEFAULT 8,
  voice_transcribe_max_seconds integer NOT NULL DEFAULT 60,
  text_reply_max_tokens integer NOT NULL DEFAULT 600,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_task_limits TO authenticated;
GRANT ALL ON public.ai_task_limits TO service_role;

ALTER TABLE public.ai_task_limits ENABLE ROW LEVEL SECURITY;

-- Only headadmins manage; authenticated reads allowed (settings are non-sensitive caps).
CREATE POLICY "anyone authed can read limits" ON public.ai_task_limits
  FOR SELECT TO authenticated USING (true);

-- seed single row
INSERT INTO public.ai_task_limits (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Public RPC for the edge function (uses service_role anyway but expose getter)
CREATE OR REPLACE FUNCTION public.get_ai_task_limits()
RETURNS public.ai_task_limits
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.ai_task_limits WHERE id = true LIMIT 1 $$;

GRANT EXECUTE ON FUNCTION public.get_ai_task_limits() TO authenticated, anon, service_role;

-- Headadmin updater RPC (checks headadmin via existing is_headadmin or session_token? fallback: service_role only)
CREATE OR REPLACE FUNCTION public.headadmin_update_ai_task_limits(
  _vision_detail text,
  _image_describe_max_tokens integer,
  _image_extract_max_tokens integer,
  _vision_match_max_tokens integer,
  _vision_match_max_candidates integer,
  _voice_transcribe_max_seconds integer,
  _text_reply_max_tokens integer
) RETURNS public.ai_task_limits
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result public.ai_task_limits;
BEGIN
  UPDATE public.ai_task_limits SET
    vision_detail = COALESCE(_vision_detail, vision_detail),
    image_describe_max_tokens = COALESCE(_image_describe_max_tokens, image_describe_max_tokens),
    image_extract_max_tokens = COALESCE(_image_extract_max_tokens, image_extract_max_tokens),
    vision_match_max_tokens = COALESCE(_vision_match_max_tokens, vision_match_max_tokens),
    vision_match_max_candidates = COALESCE(_vision_match_max_candidates, vision_match_max_candidates),
    voice_transcribe_max_seconds = COALESCE(_voice_transcribe_max_seconds, voice_transcribe_max_seconds),
    text_reply_max_tokens = COALESCE(_text_reply_max_tokens, text_reply_max_tokens),
    updated_at = now()
  WHERE id = true
  RETURNING * INTO result;
  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.headadmin_update_ai_task_limits(text,integer,integer,integer,integer,integer,integer) TO service_role;
