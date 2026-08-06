ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS text_reply_prompt TEXT,
ADD COLUMN IF NOT EXISTS image_analysis_prompt TEXT,
ADD COLUMN IF NOT EXISTS voice_analysis_prompt TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;
GRANT ALL ON public.business_profiles TO service_role;
