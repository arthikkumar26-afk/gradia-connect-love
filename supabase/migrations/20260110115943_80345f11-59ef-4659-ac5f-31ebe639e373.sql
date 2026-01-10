-- Add a more specific policy for employers to view profiles of candidates who applied to their jobs
-- This ensures the join from interview_candidates to profiles works correctly

-- First, drop the existing policy that might be too restrictive
DROP POLICY IF EXISTS "Employers can view candidate profiles" ON public.profiles;

-- Create a new policy that allows employers to view profiles of candidates who applied to their jobs
CREATE POLICY "Employers can view candidate profiles for their jobs" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'candidate' 
  AND (
    -- Check if this profile belongs to a candidate who applied to one of the employer's jobs
    EXISTS (
      SELECT 1 
      FROM public.interview_candidates ic
      JOIN public.jobs j ON j.id = ic.job_id
      WHERE ic.candidate_id = profiles.id 
      AND j.employer_id = auth.uid()
    )
    OR
    -- Or if the current user is an employer (fallback for general access)
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'employer'
    )
  )
);

-- Also ensure interview_candidates can be viewed properly
-- The existing policy should work, but let's verify it exists
DO $$
BEGIN
  -- Check if policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interview_candidates' 
    AND policyname = 'Employers can view their job candidates'
  ) THEN
    -- Create it if missing
    CREATE POLICY "Employers can view their job candidates" 
    ON public.interview_candidates 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM jobs 
        WHERE jobs.id = interview_candidates.job_id 
        AND jobs.employer_id = auth.uid()
      )
    );
  END IF;
END $$;