CREATE OR REPLACE FUNCTION public.normalize_auto_reply_keywords(_keywords text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  WITH split_keywords AS (
    SELECT
      ordinality,
      lower(regexp_replace(trim(token), '\s+', ' ', 'g')) AS keyword
    FROM unnest(COALESCE(_keywords, ARRAY[]::text[])) WITH ORDINALITY AS input(keyword_value, input_ordinality)
    CROSS JOIN LATERAL regexp_split_to_table(input.keyword_value, ',') WITH ORDINALITY AS parts(token, part_ordinality)
    CROSS JOIN LATERAL (
      SELECT ((input.input_ordinality - 1) * 100000 + parts.part_ordinality) AS ordinality
    ) ordering
  ),
  deduped AS (
    SELECT keyword, min(ordinality) AS first_seen
    FROM split_keywords
    WHERE keyword <> ''
    GROUP BY keyword
  )
  SELECT COALESCE(
    array_agg(keyword ORDER BY first_seen),
    ARRAY[]::text[]
  )
  FROM deduped
$$;

UPDATE public.auto_reply_rules
SET keywords = public.normalize_auto_reply_keywords(keywords),
    updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM unnest(keywords) AS keyword_value
  WHERE keyword_value LIKE '%,%'
     OR keyword_value <> lower(regexp_replace(trim(keyword_value), '\s+', ' ', 'g'))
);