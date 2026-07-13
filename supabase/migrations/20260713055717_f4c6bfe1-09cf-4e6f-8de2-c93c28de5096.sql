
-- 1) Mismatch tracking table
CREATE TABLE IF NOT EXISTS public.ai_reply_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  from_number text,
  customer_text text,
  ai_reply text,
  matched_product_id uuid,
  matched_product_name text,
  catalog_price numeric,
  quoted_price numeric,
  mismatch_type text NOT NULL CHECK (mismatch_type IN ('price','not_found','low_confidence')),
  confidence numeric,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.ai_reply_mismatches TO authenticated;
GRANT ALL ON public.ai_reply_mismatches TO service_role;

ALTER TABLE public.ai_reply_mismatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mismatches" ON public.ai_reply_mismatches
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()));

CREATE POLICY "Users update own mismatches" ON public.ai_reply_mismatches
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_headadmin(auth.uid()));

CREATE POLICY "Users delete own mismatches" ON public.ai_reply_mismatches
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_headadmin(auth.uid()));

CREATE INDEX IF NOT EXISTS ai_reply_mismatches_user_created_idx
  ON public.ai_reply_mismatches(user_id, created_at DESC);

CREATE TRIGGER ai_reply_mismatches_set_updated_at
  BEFORE UPDATE ON public.ai_reply_mismatches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) confidence column on ai_usage_logs
ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS match_confidence numeric;

-- 3) De-duplicate existing products, then add unique indexes
-- Rename duplicate SKUs (keep earliest)
WITH ranked AS (
  SELECT id, user_id, sku,
         row_number() OVER (PARTITION BY user_id, lower(trim(sku)) ORDER BY created_at, id) AS rn
  FROM public.products
  WHERE sku IS NOT NULL AND trim(sku) <> ''
)
UPDATE public.products p
SET sku = p.sku || ' (dup ' || r.rn || ')'
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

-- Rename duplicate names (keep earliest)
WITH ranked AS (
  SELECT id, user_id, name,
         row_number() OVER (PARTITION BY user_id, lower(trim(name)) ORDER BY created_at, id) AS rn
  FROM public.products
  WHERE name IS NOT NULL AND trim(name) <> ''
)
UPDATE public.products p
SET name = p.name || ' (dup ' || r.rn || ')'
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS products_user_sku_unique
  ON public.products(user_id, lower(trim(sku)))
  WHERE sku IS NOT NULL AND trim(sku) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS products_user_name_unique
  ON public.products(user_id, lower(trim(name)))
  WHERE name IS NOT NULL AND trim(name) <> '';
