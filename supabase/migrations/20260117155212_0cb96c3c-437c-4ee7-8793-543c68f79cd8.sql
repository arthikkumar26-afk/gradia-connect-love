-- Add live_view_token and live_view_url columns to mock_interview_sessions for real-time demo sharing
ALTER TABLE public.mock_interview_sessions
ADD COLUMN IF NOT EXISTS live_view_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS live_view_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS live_stream_started_at TIMESTAMP WITH TIME ZONE;

-- Create index for fast lookup by live view token
CREATE INDEX IF NOT EXISTS idx_mock_interview_sessions_live_view_token 
ON public.mock_interview_sessions(live_view_token)
WHERE live_view_token IS NOT NULL;