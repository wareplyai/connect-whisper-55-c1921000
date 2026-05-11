
-- 1. Restrict payment_transactions: replace ALL policy with SELECT + safe INSERT only
DROP POLICY IF EXISTS users_own_transactions ON public.payment_transactions;

CREATE POLICY users_select_own_transactions
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY users_insert_own_pending_transactions
ON public.payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND admin_note IS NULL
);

-- 2. Allow users to read admin_notifications targeted to them or to "all"
CREATE POLICY users_read_targeted_notifications
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (target = 'all' OR target_user_id = auth.uid())
);

-- 3. Allow headadmins to read files in payment-screenshots bucket
CREATE POLICY "headadmin_read_payment_screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true)
);
