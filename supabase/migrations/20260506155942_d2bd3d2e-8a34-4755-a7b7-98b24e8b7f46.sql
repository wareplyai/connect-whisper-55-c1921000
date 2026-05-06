
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============== AI API KEYS ==============
CREATE TABLE public.ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('openai','gemini','deepseek')),
  model text NOT NULL,
  encrypted_key text NOT NULL,
  key_last4 text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_api_keys_user ON public.ai_api_keys(user_id);
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own ai_api_keys" ON public.ai_api_keys
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own ai_api_keys" ON public.ai_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own ai_api_keys" ON public.ai_api_keys
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users delete own ai_api_keys" ON public.ai_api_keys
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "headadmin_ai_api_keys" ON public.ai_api_keys
  FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE TRIGGER trg_ai_api_keys_updated_at
  BEFORE UPDATE ON public.ai_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== BUSINESS PROFILES ==============
CREATE TABLE public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text,
  business_type text,
  description text,
  location text,
  working_hours text,
  contact text,
  website text,
  system_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own business_profiles" ON public.business_profiles
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own business_profiles" ON public.business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own business_profiles" ON public.business_profiles
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users delete own business_profiles" ON public.business_profiles
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "headadmin_business_profiles" ON public.business_profiles
  FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== KNOWLEDGE CHUNKS (pgvector) ==============
CREATE TABLE public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('file','text','website')),
  source_name text,
  source_url text,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_knowledge_chunks_user ON public.knowledge_chunks(user_id);
CREATE INDEX idx_knowledge_chunks_embedding ON public.knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own knowledge_chunks" ON public.knowledge_chunks
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own knowledge_chunks" ON public.knowledge_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own knowledge_chunks" ON public.knowledge_chunks
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users delete own knowledge_chunks" ON public.knowledge_chunks
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "headadmin_knowledge_chunks" ON public.knowledge_chunks
  FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

-- ============== QA PAIRS ==============
CREATE TABLE public.qa_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_pairs_user ON public.qa_pairs(user_id);
ALTER TABLE public.qa_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own qa_pairs" ON public.qa_pairs
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own qa_pairs" ON public.qa_pairs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own qa_pairs" ON public.qa_pairs
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users delete own qa_pairs" ON public.qa_pairs
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "headadmin_qa_pairs" ON public.qa_pairs
  FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE TRIGGER trg_qa_pairs_updated_at
  BEFORE UPDATE ON public.qa_pairs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== FIXED QA (keyword bypass) ==============
CREATE TABLE public.fixed_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  keyword text NOT NULL,
  reply text NOT NULL,
  match_type text NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact','contains','starts_with')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fixed_qa_user ON public.fixed_qa(user_id);
ALTER TABLE public.fixed_qa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own fixed_qa" ON public.fixed_qa
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own fixed_qa" ON public.fixed_qa
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own fixed_qa" ON public.fixed_qa
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "users delete own fixed_qa" ON public.fixed_qa
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "headadmin_fixed_qa" ON public.fixed_qa
  FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM headadmin WHERE is_active = true));

CREATE TRIGGER trg_fixed_qa_updated_at
  BEFORE UPDATE ON public.fixed_qa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
