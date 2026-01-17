-- Add class_level column to interview_question_papers for High School Board/Competitive papers
ALTER TABLE public.interview_question_papers 
ADD COLUMN IF NOT EXISTS class_level TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_question_papers_matching 
ON public.interview_question_papers(segment, category, class_level, designation, is_active);

-- Comment for clarity
COMMENT ON COLUMN public.interview_question_papers.class_level IS 'Class level for High School papers (e.g., CLASS-6,7&8, CLASS-9&10)';