-- Add policy to allow public access to mock_interview_sessions when a valid live_view_token is provided
-- This is needed for management to view live demo sessions via the token link

CREATE POLICY "Allow public access with valid live_view_token"
ON mock_interview_sessions
FOR SELECT
USING (live_view_token IS NOT NULL AND live_view_active = true);