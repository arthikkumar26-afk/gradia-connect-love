-- Drop the problematic policy
DROP POLICY "Freelancers can view candidate profiles for mentorship" ON public.profiles;

-- Create a security definer function to check if user is a freelancer
CREATE OR REPLACE FUNCTION public.is_freelancer_profile(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = 'freelancer'
  );
$$;

-- Re-create the policy using the function
CREATE POLICY "Freelancers can view candidate profiles for mentorship"
ON public.profiles
FOR SELECT
USING (
  role = 'candidate' AND is_freelancer_profile(auth.uid())
);