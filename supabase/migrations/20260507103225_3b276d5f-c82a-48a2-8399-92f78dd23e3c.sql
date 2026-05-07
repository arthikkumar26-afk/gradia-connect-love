DROP POLICY IF EXISTS "Insert employer notifications" ON public.employer_notifications;
CREATE POLICY "Insert employer notifications" ON public.employer_notifications
FOR INSERT TO authenticated
WITH CHECK (
  employer_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
  OR public.is_hr_user(auth.uid())
);