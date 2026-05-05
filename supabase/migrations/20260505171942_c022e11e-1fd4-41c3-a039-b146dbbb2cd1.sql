CREATE POLICY "HR can view their own resume invites"
ON public.resume_invites
FOR SELECT
TO authenticated
USING (
  sender_user_id = auth.uid()
  OR public.is_hr_user(auth.uid())
  OR public.is_hr_manager(auth.uid())
);