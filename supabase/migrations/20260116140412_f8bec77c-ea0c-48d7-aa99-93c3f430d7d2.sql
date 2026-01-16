-- Add segment, category, and designation columns to interview_question_papers for role-based assignment
ALTER TABLE public.interview_question_papers
ADD COLUMN segment TEXT,
ADD COLUMN category TEXT,
ADD COLUMN designation TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.interview_question_papers.segment IS 'Segment like Pre-Primary, Primary, Secondary, etc.';
COMMENT ON COLUMN public.interview_question_papers.category IS 'Category like Teaching, Helping/Supporting, Admin, etc.';
COMMENT ON COLUMN public.interview_question_papers.designation IS 'Designation like MOTHER TEACHER, ASSO.TEACHER, VICE PRINCIPAL, etc.';