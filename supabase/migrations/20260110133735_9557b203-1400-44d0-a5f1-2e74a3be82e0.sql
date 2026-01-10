-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Employers can view candidate profiles for their jobs" ON public.profiles;

-- Create a security definer function to check if user is employer
-- This avoids the infinite recursion by bypassing RLS
CREATE OR REPLACE FUNCTION public.is_employer_by_role(_user_id uuid)
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

-- Recreate the policy using the security definer function
CREATE POLICY "Employers can view candidate profiles for their jobs"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (role = 'candidate' AND (
    -- Employer has this candidate in their interview pipeline
    EXISTS (
      SELECT 1
      FROM interview_candidates ic
      JOIN jobs j ON j.id = ic.job_id
      WHERE ic.candidate_id = profiles.id AND j.employer_id = auth.uid()
    )
    OR
    -- User is an employer (using security definer function to avoid recursion)
    public.is_employer_by_role(auth.uid())
  ))
);