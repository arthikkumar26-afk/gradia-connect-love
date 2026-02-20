
-- Drop the recursive policy
DROP POLICY IF EXISTS "Employers can view all candidate profiles" ON public.profiles;

-- Recreate using the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Employers can view all candidate profiles"
ON public.profiles
FOR SELECT
USING (
  role = 'candidate' AND
  public.is_employer_profile(auth.uid())
);
