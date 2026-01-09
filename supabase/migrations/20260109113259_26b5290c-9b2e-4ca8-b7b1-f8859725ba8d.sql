-- Create a security definer function to check if user is an employer via profiles table
CREATE OR REPLACE FUNCTION public.is_employer_profile(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = 'employer'
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Employers can view candidate profiles" ON public.profiles;

-- Recreate the policy using the security definer function to avoid recursion
CREATE POLICY "Employers can view candidate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'candidate' AND public.is_employer_profile(auth.uid())
);