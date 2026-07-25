
-- Employers can view mock sessions of candidates who applied to their jobs
CREATE POLICY "Employers view mock sessions of applicants"
ON public.mock_interview_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = mock_interview_sessions.candidate_id
      AND j.employer_id = auth.uid()
  )
  OR public.is_hr_user(auth.uid())
  OR public.is_admin_or_owner(auth.uid())
);

CREATE POLICY "Employers view mock stage results of applicants"
ON public.mock_interview_stage_results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mock_interview_sessions s
    JOIN public.applications a ON a.candidate_id = s.candidate_id
    JOIN public.jobs j ON j.id = a.job_id
    WHERE s.id = mock_interview_stage_results.session_id
      AND j.employer_id = auth.uid()
  )
  OR public.is_hr_user(auth.uid())
  OR public.is_admin_or_owner(auth.uid())
);
