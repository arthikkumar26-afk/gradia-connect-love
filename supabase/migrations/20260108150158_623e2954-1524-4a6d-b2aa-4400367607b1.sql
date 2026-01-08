-- Allow employers to delete interview candidates for their jobs
CREATE POLICY "Employers can delete their job candidates"
ON public.interview_candidates
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM jobs
  WHERE jobs.id = interview_candidates.job_id
  AND jobs.employer_id = auth.uid()
));

-- Allow employers to delete interview events for their candidates
CREATE POLICY "Employers can delete interview events"
ON public.interview_events
FOR DELETE
USING (EXISTS (
  SELECT 1
  FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.id = interview_events.interview_candidate_id
  AND j.employer_id = auth.uid()
));

-- Allow employers to delete interview responses for their candidates
CREATE POLICY "Employers can delete interview responses"
ON public.interview_responses
FOR DELETE
USING (EXISTS (
  SELECT 1
  FROM interview_events ie
  JOIN interview_candidates ic ON ic.id = ie.interview_candidate_id
  JOIN jobs j ON j.id = ic.job_id
  WHERE ie.id = interview_responses.interview_event_id
  AND j.employer_id = auth.uid()
));