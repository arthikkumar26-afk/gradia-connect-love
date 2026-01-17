-- Create employer registrations table to store registration details
CREATE TABLE public.employer_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_email TEXT,
  company_phone TEXT,
  company_website TEXT,
  company_description TEXT,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  town_city TEXT,
  pin_code TEXT,
  tc_accepted BOOLEAN NOT NULL DEFAULT false,
  tc_accepted_at TIMESTAMP WITH TIME ZONE,
  benefits TEXT,
  registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.employer_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Employers can view their own registration"
ON public.employer_registrations
FOR SELECT
USING (auth.uid() = employer_id);

CREATE POLICY "Employers can insert their own registration"
ON public.employer_registrations
FOR INSERT
WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own registration"
ON public.employer_registrations
FOR UPDATE
USING (auth.uid() = employer_id);

CREATE POLICY "Admins can manage all registrations"
ON public.employer_registrations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_employer_registrations_updated_at
  BEFORE UPDATE ON public.employer_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_employer_registrations_employer_id ON public.employer_registrations(employer_id);
CREATE INDEX idx_employer_registrations_status ON public.employer_registrations(registration_status);