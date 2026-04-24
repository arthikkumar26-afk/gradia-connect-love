CREATE POLICY "Candidates can view their own invitations"
ON public.interview_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.interview_events ie
    JOIN public.interview_candidates ic ON ic.id = ie.interview_candidate_id
    WHERE ie.id = interview_invitations.interview_event_id
      AND ic.candidate_id = auth.uid()
  )
);