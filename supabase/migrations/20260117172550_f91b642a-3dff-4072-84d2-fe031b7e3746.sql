-- Add policy to allow public access to profiles when viewing a live demo session
-- This is needed for management to see candidate details via the live view token

CREATE POLICY "Allow public access to candidate profiles for live demo viewing"
ON profiles
FOR SELECT
USING (
  role = 'candidate' AND 
  EXISTS (
    SELECT 1 FROM mock_interview_sessions 
    WHERE mock_interview_sessions.candidate_id = profiles.id 
    AND mock_interview_sessions.live_view_token IS NOT NULL 
    AND mock_interview_sessions.live_view_active = true
  )
);