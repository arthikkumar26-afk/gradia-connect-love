CREATE POLICY "HR users can view candidate profiles"
ON public.profiles
FOR SELECT
USING (
  role = 'candidate' AND public.is_hr_user(auth.uid())
);