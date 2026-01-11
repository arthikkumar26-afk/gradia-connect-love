-- Fix excessive profile data exposure by restricting RLS policies

-- Drop overly permissive candidate profile policy
DROP POLICY IF EXISTS "Employers can view candidate profiles for their jobs" ON public.profiles;

-- Create more restrictive policy - employers can only see candidates who applied to their jobs
CREATE POLICY "Employers can view applicant profiles only"
ON public.profiles FOR SELECT
USING (
  role = 'candidate' 
  AND (
    -- User owns the profile
    auth.uid() = id
    OR
    -- Employer can see candidates who applied to their jobs or are in their pipeline
    EXISTS (
      SELECT 1 FROM interview_candidates ic
      JOIN jobs j ON j.id = ic.job_id
      WHERE ic.candidate_id = profiles.id
      AND j.employer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = profiles.id
      AND j.employer_id = auth.uid()
    )
  )
);

-- Drop overly permissive employer profile policy  
DROP POLICY IF EXISTS "Employer profiles viewable by authenticated users" ON public.profiles;

-- Create more restrictive policy - employer profiles only visible to candidates who applied
CREATE POLICY "Employer profiles viewable by applicants"
ON public.profiles FOR SELECT
USING (
  role = 'employer'
  AND (
    -- User owns the profile
    auth.uid() = id
    OR
    -- Candidates can see employer profiles for jobs they applied to
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.employer_id = profiles.id
      AND a.candidate_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM interview_candidates ic
      JOIN jobs j ON ic.job_id = j.id
      WHERE j.employer_id = profiles.id
      AND ic.candidate_id = auth.uid()
    )
    -- Allow sponsors to see employer profiles
    OR has_role(auth.uid(), 'sponsor')
    -- Allow admins/owners to see all
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'owner')
  )
);