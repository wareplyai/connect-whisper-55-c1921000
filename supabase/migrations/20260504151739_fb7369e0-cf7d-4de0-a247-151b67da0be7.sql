
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS screenshot_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users upload own payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users view own payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true)));
