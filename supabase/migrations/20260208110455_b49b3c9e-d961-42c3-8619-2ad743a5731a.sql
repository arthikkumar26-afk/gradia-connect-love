
-- Add interview_candidate_id to management_reviews for employer pipeline support
ALTER TABLE public.management_reviews
ADD COLUMN interview_candidate_id uuid REFERENCES public.interview_candidates(id) ON DELETE CASCADE;

-- Make session_id nullable since employer pipeline reviews won't have one
ALTER TABLE public.management_reviews
ALTER COLUMN session_id DROP NOT NULL;

-- Add RLS policy for employers to view reviews for their candidates
CREATE POLICY "Employers can view reviews for their candidates"
ON public.management_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM interview_candidates ic
    JOIN jobs j ON j.id = ic.job_id
    WHERE ic.id = management_reviews.interview_candidate_id
    AND j.employer_id = auth.uid()
  )
);

-- Allow public insert/update for feedback via token (no auth needed)
CREATE POLICY "Anyone can insert review via service role"
ON public.management_reviews
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update review via feedback token"
ON public.management_reviews
FOR UPDATE
USING (feedback_token IS NOT NULL);
