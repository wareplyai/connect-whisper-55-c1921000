
-- 1) Profiles: prevent privilege escalation via self-update
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_headadmin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.plan := OLD.plan;
  NEW.approval_status := OLD.approval_status;
  NEW.approved_at := OLD.approved_at;
  NEW.max_sessions := OLD.max_sessions;
  NEW.max_products := OLD.max_products;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) activity_logs: deny writes for non-headadmin
CREATE POLICY "deny_non_headadmin_insert_activity_logs"
ON public.activity_logs AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_headadmin(auth.uid()));

CREATE POLICY "deny_non_headadmin_update_activity_logs"
ON public.activity_logs AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_headadmin(auth.uid()))
WITH CHECK (public.is_headadmin(auth.uid()));

CREATE POLICY "deny_non_headadmin_delete_activity_logs"
ON public.activity_logs AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_headadmin(auth.uid()));

-- 3) platform_stats: deny writes for non-headadmin
CREATE POLICY "deny_non_headadmin_insert_platform_stats"
ON public.platform_stats AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_headadmin(auth.uid()));

CREATE POLICY "deny_non_headadmin_update_platform_stats"
ON public.platform_stats AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_headadmin(auth.uid()))
WITH CHECK (public.is_headadmin(auth.uid()));

CREATE POLICY "deny_non_headadmin_delete_platform_stats"
ON public.platform_stats AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_headadmin(auth.uid()));

-- 4) sms_transactions: deny writes for non-headadmin
CREATE POLICY "deny_non_headadmin_insert_sms_transactions"
ON public.sms_transactions AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_headadmin(auth.uid()));

CREATE POLICY "deny_non_headadmin_update_sms_transactions"
ON public.sms_transactions AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_headadmin(auth.uid()))
WITH CHECK (public.is_headadmin(auth.uid()));

CREATE POLICY "deny_non_headadmin_delete_sms_transactions"
ON public.sms_transactions AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_headadmin(auth.uid()));
