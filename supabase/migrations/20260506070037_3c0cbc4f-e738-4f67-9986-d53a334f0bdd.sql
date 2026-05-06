UPDATE public.auto_reply_rules
SET keywords = public.normalize_auto_reply_keywords(keywords),
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM unnest(keywords) AS kv WHERE kv ~ '[,\s]'
);