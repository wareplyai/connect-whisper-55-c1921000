
GRANT EXECUTE ON FUNCTION public.headadmin_update_ai_task_limits(text,integer,integer,integer,integer,integer,integer) TO authenticated;

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
  IF NOT public.is_headadmin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
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
