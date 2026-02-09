
-- Add DELETE policies for tables that reference interview_candidates/events 
-- so employers can fully purge candidate data

-- interview_invitations (references interview_events)
CREATE POLICY "Employers can delete interview invitations"
ON public.interview_invitations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM interview_events ie
  JOIN interview_candidates ic ON ic.id = ie.interview_candidate_id
  JOIN jobs j ON j.id = ic.job_id
  WHERE ie.id = interview_invitations.interview_event_id AND j.employer_id = auth.uid()
));

-- viva_evaluations (references interview_candidates)
CREATE POLICY "Employers can delete viva evaluations for their candidates"
ON public.viva_evaluations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.id = viva_evaluations.interview_candidate_id AND j.employer_id = auth.uid()
));

-- viva_sessions (references interview_candidates)
CREATE POLICY "Employers can delete viva sessions for their candidates"
ON public.viva_sessions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.id = viva_sessions.interview_candidate_id AND j.employer_id = auth.uid()
));

-- offer_letters (references interview_candidates)
CREATE POLICY "Employers can delete offer letters for their candidates"
ON public.offer_letters FOR DELETE
USING (EXISTS (
  SELECT 1 FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.id = offer_letters.interview_candidate_id AND j.employer_id = auth.uid()
));

-- ai_interview_sessions (references interview_candidates)
CREATE POLICY "Employers can delete AI interview sessions for their candidates"
ON public.ai_interview_sessions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.id = ai_interview_sessions.interview_candidate_id AND j.employer_id = auth.uid()
));
