
-- Create a security definer function for candidates to check their own reviews
CREATE OR REPLACE FUNCTION public.is_candidate_review(_user_id uuid, _interview_candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.interview_candidates
    WHERE id = _interview_candidate_id
      AND candidate_id = _user_id
  )
$$;

-- Drop old policy and recreate with security definer function
DROP POLICY IF EXISTS "Candidates can view their employer pipeline reviews" ON public.management_reviews;

CREATE POLICY "Candidates can view their employer pipeline reviews"
ON public.management_reviews
FOR SELECT
TO authenticated
USING (
  interview_candidate_id IS NOT NULL
  AND public.is_candidate_review(auth.uid(), interview_candidate_id)
);
