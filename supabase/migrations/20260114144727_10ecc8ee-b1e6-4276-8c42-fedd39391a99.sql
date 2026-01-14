-- Create educational_qualifications table
CREATE TABLE public.educational_qualifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  education_level text NOT NULL,
  school_college_name text,
  specialization text,
  board_university text,
  year_of_passing integer,
  percentage_marks numeric(5,2),
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.educational_qualifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own qualifications"
ON public.educational_qualifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own qualifications"
ON public.educational_qualifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own qualifications"
ON public.educational_qualifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own qualifications"
ON public.educational_qualifications
FOR DELETE
USING (auth.uid() = user_id);

-- Employers can view qualifications of their applicants
CREATE POLICY "Employers can view applicant qualifications"
ON public.educational_qualifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM interview_candidates ic
    JOIN jobs j ON j.id = ic.job_id
    WHERE ic.candidate_id = educational_qualifications.user_id
    AND j.employer_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = educational_qualifications.user_id
    AND j.employer_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_educational_qualifications_updated_at
BEFORE UPDATE ON public.educational_qualifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();