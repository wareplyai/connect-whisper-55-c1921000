
-- 1) ai_api_keys: prevent regular users from inserting/updating global or admin-override keys
DROP POLICY IF EXISTS "users insert own ai_api_keys" ON public.ai_api_keys;
CREATE POLICY "users insert own ai_api_keys"
  ON public.ai_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_headadmin(auth.uid())
      OR (COALESCE(is_global, false) = false AND COALESCE(is_admin_override, false) = false)
    )
  );

DROP POLICY IF EXISTS "users update own ai_api_keys" ON public.ai_api_keys;
CREATE POLICY "users update own ai_api_keys"
  ON public.ai_api_keys
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.is_headadmin(auth.uid())
  )
  WITH CHECK (
    public.is_headadmin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      auth.uid() = user_id
      AND COALESCE(is_global, false) = false
      AND COALESCE(is_admin_override, false) = false
    )
  );

-- 2) payment_methods: restrict public read to authenticated users only
DROP POLICY IF EXISTS "public_read_payment_methods" ON public.payment_methods;
CREATE POLICY "authenticated_read_payment_methods"
  ON public.payment_methods
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.payment_methods FROM anon;
GRANT SELECT ON public.payment_methods TO authenticated;
