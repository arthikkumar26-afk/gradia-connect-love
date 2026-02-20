
-- Allow employers to view all candidate profiles in the Candidates directory
CREATE POLICY "Employers can view all candidate profiles"
ON public.profiles
FOR SELECT
USING (
  role = 'candidate' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'employer'
  )
);
