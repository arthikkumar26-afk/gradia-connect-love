-- Add recording_url column to mock_interview_stage_results table
ALTER TABLE public.mock_interview_stage_results 
ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN public.mock_interview_stage_results.recording_url IS 'URL to the recorded video of the interview stage';