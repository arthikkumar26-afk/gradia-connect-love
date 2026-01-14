-- Create family_details table for candidates
CREATE TABLE public.family_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blood_relation TEXT NOT NULL,
  name_as_per_aadhar TEXT,
  date_of_birth DATE,
  is_dependent BOOLEAN DEFAULT false,
  age INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_details ENABLE ROW LEVEL SECURITY;

-- Users can view their own family details
CREATE POLICY "Users can view their own family details"
ON public.family_details
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own family details
CREATE POLICY "Users can insert their own family details"
ON public.family_details
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own family details
CREATE POLICY "Users can update their own family details"
ON public.family_details
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own family details
CREATE POLICY "Users can delete their own family details"
ON public.family_details
FOR DELETE
USING (auth.uid() = user_id);

-- Employers can view applicant family details
CREATE POLICY "Employers can view applicant family details"
ON public.family_details
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM interview_candidates ic
    JOIN jobs j ON j.id = ic.job_id
    WHERE ic.candidate_id = family_details.user_id
    AND j.employer_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = family_details.user_id
    AND j.employer_id = auth.uid()
  ))
);