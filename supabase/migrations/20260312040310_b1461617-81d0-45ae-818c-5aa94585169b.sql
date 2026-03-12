
-- Drop the old policy and function, use has_role instead for consistency
DROP POLICY IF EXISTS "EduTech can view candidate profiles" ON public.profiles;

CREATE POLICY "EduTech can view candidate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'candidate' AND public.has_role(auth.uid(), 'edutech'));
