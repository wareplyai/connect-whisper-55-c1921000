UPDATE public.auto_reply_rules
SET keywords = COALESCE((
  SELECT array_agg(DISTINCT lower(trim(token)) ORDER BY lower(trim(token)))
  FROM unnest(keywords) AS keyword_value
  CROSS JOIN LATERAL regexp_split_to_table(keyword_value, '[,\s]+') AS token
  WHERE trim(token) <> ''
), ARRAY[]::text[])
WHERE EXISTS (
  SELECT 1
  FROM unnest(keywords) AS keyword_value
  WHERE keyword_value ~ '[,\s]'
);