-- Create address_details table for candidates
CREATE TABLE public.address_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Present Address
  present_door_flat_no TEXT,
  present_street TEXT,
  present_village_area TEXT,
  present_mandal TEXT,
  present_district TEXT,
  present_state TEXT,
  present_pin_code TEXT,
  -- Permanent Address
  permanent_door_flat_no TEXT,
  permanent_street TEXT,
  permanent_village_area TEXT,
  permanent_mandal TEXT,
  permanent_district TEXT,
  permanent_state TEXT,
  permanent_pin_code TEXT,
  -- Same as present flag
  same_as_present BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.address_details ENABLE ROW LEVEL SECURITY;

-- Users can view their own address
CREATE POLICY "Users can view their own address"
ON public.address_details
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own address
CREATE POLICY "Users can insert their own address"
ON public.address_details
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own address
CREATE POLICY "Users can update their own address"
ON public.address_details
FOR UPDATE
USING (auth.uid() = user_id);

-- Employers can view applicant address
CREATE POLICY "Employers can view applicant address"
ON public.address_details
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM interview_candidates ic
    JOIN jobs j ON j.id = ic.job_id
    WHERE ic.candidate_id = address_details.user_id
    AND j.employer_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = address_details.user_id
    AND j.employer_id = auth.uid()
  ))
);