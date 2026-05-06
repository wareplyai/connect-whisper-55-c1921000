-- 1) HEADADMIN: enable RLS, replace permissive public read with self-only read
ALTER TABLE public.headadmin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_auth_read_headadmin ON public.headadmin;

CREATE POLICY "headadmin read own row"
ON public.headadmin
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "headadmin update own row"
ON public.headadmin
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- 2) ORDERS: remove blanket public read; allow owner-only read
DROP POLICY IF EXISTS public_read_orders_by_id ON public.orders;

CREATE POLICY "users view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3) USER_ROLES: explicit RESTRICTIVE deny for non-admin writes (defense in depth)
CREATE POLICY "deny non-admin role writes"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) SALES: allow users to read their own sales rows
CREATE POLICY "users view own sales"
ON public.sales
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);