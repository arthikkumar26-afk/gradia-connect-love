-- Create table for storing candidate resume data
CREATE TABLE public.candidate_resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  summary TEXT,
  experience JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  skills TEXT[] DEFAULT '{}',
  selected_template TEXT DEFAULT 'modern',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.candidate_resumes ENABLE ROW LEVEL SECURITY;

-- Users can view their own resume
CREATE POLICY "Users can view their own resume"
ON public.candidate_resumes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own resume
CREATE POLICY "Users can insert their own resume"
ON public.candidate_resumes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own resume
CREATE POLICY "Users can update their own resume"
ON public.candidate_resumes
FOR UPDATE
USING (auth.uid() = user_id);

-- Employers can view applicant resumes
CREATE POLICY "Employers can view applicant resumes"
ON public.candidate_resumes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM interview_candidates ic
    JOIN jobs j ON j.id = ic.job_id
    WHERE ic.candidate_id = candidate_resumes.user_id
    AND j.employer_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = candidate_resumes.user_id
    AND j.employer_id = auth.uid()
  )
);

-- Trigger for updating updated_at
CREATE TRIGGER update_candidate_resumes_updated_at
BEFORE UPDATE ON public.candidate_resumes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();