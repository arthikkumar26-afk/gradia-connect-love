-- Allow candidates to read employer pipeline feedback tied to their interview records
CREATE POLICY "Candidates can view their employer pipeline reviews"
ON public.management_reviews
FOR SELECT
TO public
USING (
  interview_candidate_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.interview_candidates ic
    WHERE ic.id = management_reviews.interview_candidate_id
      AND ic.candidate_id = auth.uid()
  )
);