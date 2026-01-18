-- Create table for HR negotiations
CREATE TABLE public.hr_negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  negotiation_type TEXT NOT NULL DEFAULT 'form', -- 'form' or 'call'
  -- Negotiation form fields
  expected_salary NUMERIC,
  current_salary NUMERIC,
  notice_period TEXT,
  preferred_joining_date DATE,
  relocation_required BOOLEAN,
  willing_to_relocate BOOLEAN,
  preferred_location TEXT,
  additional_requirements TEXT,
  -- HR call scheduling
  preferred_call_date DATE,
  preferred_call_time TEXT,
  call_scheduled_at TIMESTAMP WITH TIME ZONE,
  call_meeting_link TEXT,
  call_notes TEXT,
  -- Admin response
  admin_response TEXT,
  offered_salary NUMERIC,
  offered_joining_date DATE,
  admin_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, under_review, call_scheduled, approved, rejected, counter_offer
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hr_negotiations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own negotiations" 
ON public.hr_negotiations 
FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Users can create their own negotiations" 
ON public.hr_negotiations 
FOR INSERT 
WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Users can update their own negotiations" 
ON public.hr_negotiations 
FOR UPDATE 
USING (auth.uid() = candidate_id);

-- Policy for admins to view all negotiations
CREATE POLICY "Admins can view all negotiations"
ON public.hr_negotiations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'employer', 'owner')
  )
);

-- Policy for admins to update all negotiations
CREATE POLICY "Admins can update all negotiations"
ON public.hr_negotiations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'employer', 'owner')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hr_negotiations_updated_at
BEFORE UPDATE ON public.hr_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();