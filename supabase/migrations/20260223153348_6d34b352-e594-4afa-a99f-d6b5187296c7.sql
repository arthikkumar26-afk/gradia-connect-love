
-- Add pipeline type columns to mock_interview_sessions so the selected pipeline persists
ALTER TABLE public.mock_interview_sessions
  ADD COLUMN IF NOT EXISTS interview_type TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_type TEXT;
