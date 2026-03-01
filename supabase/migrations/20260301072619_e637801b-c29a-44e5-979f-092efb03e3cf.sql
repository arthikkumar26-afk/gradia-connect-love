-- Allow freelancers to search candidate profiles for mentorship enrollment
CREATE POLICY "Freelancers can view candidate profiles for mentorship"
ON public.profiles
FOR SELECT
USING (
  role = 'candidate' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'freelancer'
  )
);