
-- Add approval status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check CHECK (approval_status IN ('pending','approved','rejected'));

-- Existing users: auto-approve so they aren't locked out
UPDATE public.profiles SET approval_status = 'approved', approved_at = COALESCE(approved_at, now())
  WHERE approval_status = 'pending';

-- handle_new_user: set new signups to pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approval_status)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'pending');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- Allow headadmin to update approval columns (uses existing is_headadmin policy patterns)
-- Headadmin already has full access via existing policies typically; ensure update policy exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='headadmin_update_approval'
  ) THEN
    CREATE POLICY headadmin_update_approval ON public.profiles
      FOR UPDATE TO authenticated
      USING (public.is_headadmin(auth.uid()))
      WITH CHECK (public.is_headadmin(auth.uid()));
  END IF;
END $$;

-- Allow user to read own approval_status (likely already covered by existing self-select policy)
