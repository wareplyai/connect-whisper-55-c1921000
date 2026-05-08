CREATE POLICY "users delete own incoming_messages"
ON public.incoming_messages
FOR DELETE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));