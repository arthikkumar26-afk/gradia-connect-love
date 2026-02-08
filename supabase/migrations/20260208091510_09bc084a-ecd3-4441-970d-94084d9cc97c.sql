-- Allow employers to view slot bookings for their interview candidates
CREATE POLICY "Employers can view slot bookings for their candidates"
ON public.slot_bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM interview_candidates ic
    JOIN jobs j ON j.id = ic.job_id
    WHERE ic.candidate_id = slot_bookings.candidate_id
    AND j.employer_id = auth.uid()
  )
);