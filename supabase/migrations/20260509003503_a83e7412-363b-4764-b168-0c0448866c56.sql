
-- Enforce strict global uniqueness on WhatsApp phone numbers across all sessions
-- (regardless of status). Only deleting the existing session frees the number.
DROP INDEX IF EXISTS public.unique_active_phone;

CREATE UNIQUE INDEX unique_session_phone_number
  ON public.sessions (phone_number)
  WHERE phone_number IS NOT NULL;
