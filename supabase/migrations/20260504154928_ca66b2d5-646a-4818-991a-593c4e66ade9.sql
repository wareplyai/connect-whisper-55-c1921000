
-- Allow headadmin to manage subscriptions
CREATE POLICY "headadmin_manage_subscriptions" ON public.subscriptions
FOR ALL
USING (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true))
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

-- Allow headadmin to update + read profiles (needed to activate plans)
CREATE POLICY "headadmin_update_profiles" ON public.profiles
FOR UPDATE
USING (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true))
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

CREATE POLICY "headadmin_read_profiles" ON public.profiles
FOR SELECT
USING (auth.uid() IN (SELECT auth_user_id FROM public.headadmin WHERE is_active = true));

-- Backfill: the already-approved Plus transaction that never activated
UPDATE public.profiles SET plan = 'plus', max_sessions = 6
WHERE id = 'ad64a4a5-3cfa-4688-89bf-7bfc51f3e138';

INSERT INTO public.subscriptions (user_id, plan, max_sessions, status)
VALUES ('ad64a4a5-3cfa-4688-89bf-7bfc51f3e138', 'plus', 6, 'active');
