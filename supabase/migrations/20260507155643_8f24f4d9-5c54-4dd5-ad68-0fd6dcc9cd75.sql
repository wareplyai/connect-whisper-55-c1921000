
-- Global feature toggles (controls whether features are shown to ALL users by default)
CREATE TABLE IF NOT EXISTS public.global_feature_settings (
  feature TEXT PRIMARY KEY,
  show_to_users BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.global_feature_settings (feature, show_to_users) VALUES
  ('ai_agent', true), ('auto_replies', true)
ON CONFLICT (feature) DO NOTHING;

ALTER TABLE public.global_feature_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read global features"
  ON public.global_feature_settings FOR SELECT
  USING (true);

CREATE POLICY "headadmin manage global features"
  ON public.global_feature_settings FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

-- Per-user feature overrides
CREATE TABLE IF NOT EXISTS public.user_feature_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);

ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own feature access"
  ON public.user_feature_access FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

CREATE POLICY "headadmin manage user feature access"
  ON public.user_feature_access FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true))
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

-- Helper function
CREATE OR REPLACE FUNCTION public.can_access_feature(_user_id UUID, _feature TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.user_feature_access WHERE user_id = _user_id AND feature = _feature),
    (SELECT show_to_users FROM public.global_feature_settings WHERE feature = _feature),
    true
  );
$$;
