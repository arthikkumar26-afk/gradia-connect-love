
-- Add job_id and set_number to interview_question_papers for QPM
ALTER TABLE public.interview_question_papers 
ADD COLUMN job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
ADD COLUMN set_number integer DEFAULT 1 CHECK (set_number >= 1 AND set_number <= 4);

-- Make pdf_url nullable since QPM papers are manually entered (no PDF)
ALTER TABLE public.interview_question_papers 
ALTER COLUMN pdf_url DROP NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_question_papers_job_id ON public.interview_question_papers(job_id);

-- Allow employers to manage question papers for their own jobs
CREATE POLICY "Employers can manage their own job question papers"
ON public.interview_question_papers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = interview_question_papers.job_id 
    AND jobs.employer_id = auth.uid()
  )
);

-- Allow employers to manage questions for their papers
CREATE POLICY "Employers can manage questions for their papers"
ON public.interview_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.interview_question_papers iqp
    JOIN public.jobs j ON j.id = iqp.job_id
    WHERE iqp.id = interview_questions.paper_id 
    AND j.employer_id = auth.uid()
  )
);

-- Allow employers to manage answer keys for their questions
CREATE POLICY "Employers can manage answer keys for their questions"
ON public.interview_answer_keys
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.interview_questions iq
    JOIN public.interview_question_papers iqp ON iqp.id = iq.paper_id
    JOIN public.jobs j ON j.id = iqp.job_id
    WHERE iq.id = interview_answer_keys.question_id
    AND j.employer_id = auth.uid()
  )
);

-- Allow employers to manage solutions for their questions
CREATE POLICY "Employers can manage solutions for their questions"
ON public.interview_solutions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.interview_questions iq
    JOIN public.interview_question_papers iqp ON iqp.id = iq.paper_id
    JOIN public.jobs j ON j.id = iqp.job_id
    WHERE iq.id = interview_solutions.question_id
    AND j.employer_id = auth.uid()
  )
);
