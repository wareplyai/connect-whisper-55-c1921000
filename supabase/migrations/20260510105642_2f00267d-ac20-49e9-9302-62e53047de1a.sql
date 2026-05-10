ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS temperature numeric NOT NULL DEFAULT 0.7;
ALTER TABLE public.business_profiles ALTER COLUMN max_tokens SET DEFAULT 2000;
UPDATE public.business_profiles SET max_tokens = 2000 WHERE max_tokens = 500;