-- Add DELETE policy on slot_bookings for employers so reset can clear bookings
CREATE POLICY "Employers can delete slot bookings for their candidates"
ON public.slot_bookings
FOR DELETE
USING (EXISTS (
  SELECT 1
  FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.candidate_id = slot_bookings.candidate_id
  AND j.employer_id = auth.uid()
));

-- Add DELETE policy on management_reviews for employers
CREATE POLICY "Employers can delete management reviews for their candidates"
ON public.management_reviews
FOR DELETE
USING (EXISTS (
  SELECT 1
  FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.id = management_reviews.interview_candidate_id
  AND j.employer_id = auth.uid()
));