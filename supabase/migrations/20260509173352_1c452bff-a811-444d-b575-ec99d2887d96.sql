
CREATE TABLE public.dashboard_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ads"
  ON public.dashboard_ads FOR SELECT
  USING (is_active = true OR public.is_headadmin(auth.uid()));

CREATE POLICY "Headadmins can insert ads"
  ON public.dashboard_ads FOR INSERT
  WITH CHECK (public.is_headadmin(auth.uid()));

CREATE POLICY "Headadmins can update ads"
  ON public.dashboard_ads FOR UPDATE
  USING (public.is_headadmin(auth.uid()));

CREATE POLICY "Headadmins can delete ads"
  ON public.dashboard_ads FOR DELETE
  USING (public.is_headadmin(auth.uid()));

CREATE TRIGGER trg_dashboard_ads_updated
  BEFORE UPDATE ON public.dashboard_ads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_ads;
ALTER TABLE public.dashboard_ads REPLICA IDENTITY FULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-ads', 'dashboard-ads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read dashboard ads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dashboard-ads');

CREATE POLICY "Headadmins upload dashboard ads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dashboard-ads' AND public.is_headadmin(auth.uid()));

CREATE POLICY "Headadmins update dashboard ads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'dashboard-ads' AND public.is_headadmin(auth.uid()));

CREATE POLICY "Headadmins delete dashboard ads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dashboard-ads' AND public.is_headadmin(auth.uid()));
