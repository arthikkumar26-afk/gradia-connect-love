ALTER TABLE public.interview_question_papers 
  ADD COLUMN part text DEFAULT NULL,
  ADD COLUMN topic text DEFAULT NULL,
  ADD COLUMN division text DEFAULT NULL;