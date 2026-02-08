-- Allow public read access to interview_candidates by ID (for email slot booking links)
-- This is similar to the existing "Public read access for interview via link" on ai_interview_sessions
CREATE POLICY "Public read access for slot booking links"
ON public.interview_candidates
FOR SELECT
USING (true);
