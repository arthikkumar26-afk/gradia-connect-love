-- Allow inserts to slot_bookings when candidate_id matches through interview_candidates table
-- This covers cases where candidate visits BookSlot page and auth.uid() matches their profile id
-- Also allow unauthenticated inserts for candidates coming from email links
DROP POLICY IF EXISTS "Candidates can create their own bookings" ON public.slot_bookings;

CREATE POLICY "Candidates can create their own bookings"
ON public.slot_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = candidate_id 
  OR EXISTS (
    SELECT 1 FROM public.interview_candidates ic
    WHERE ic.candidate_id = slot_bookings.candidate_id
    AND ic.candidate_id = auth.uid()
  )
);

-- Also allow anon inserts for candidates coming from email booking links
CREATE POLICY "Allow slot booking via email link"
ON public.slot_bookings
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interview_candidates ic
    WHERE ic.candidate_id = slot_bookings.candidate_id
  )
);