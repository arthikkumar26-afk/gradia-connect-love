-- Add columns for strengths and improvements to mock_interview_stage_results
ALTER TABLE public.mock_interview_stage_results 
ADD COLUMN IF NOT EXISTS strengths text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS improvements text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS question_scores jsonb DEFAULT '[]';