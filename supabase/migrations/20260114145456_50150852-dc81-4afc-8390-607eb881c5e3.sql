-- Create work_experience table for candidates
CREATE TABLE public.work_experience (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  from_date DATE,
  to_date DATE,
  salary_per_month NUMERIC,
  place TEXT,
  reference_name TEXT,
  reference_mobile TEXT,
  worked_with_narayana BOOLEAN DEFAULT false,
  narayana_emp_id TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;

-- Users can view their own experience
CREATE POLICY "Users can view their own experience"
ON public.work_experience
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own experience
CREATE POLICY "Users can insert their own experience"
ON public.work_experience
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own experience
CREATE POLICY "Users can update their own experience"
ON public.work_experience
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own experience
CREATE POLICY "Users can delete their own experience"
ON public.work_experience
FOR DELETE
USING (auth.uid() = user_id);

-- Employers can view applicant experience
CREATE POLICY "Employers can view applicant experience"
ON public.work_experience
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM interview_candidates ic
    JOIN jobs j ON j.id = ic.job_id
    WHERE ic.candidate_id = work_experience.user_id
    AND j.employer_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = work_experience.user_id
    AND j.employer_id = auth.uid()
  ))
);