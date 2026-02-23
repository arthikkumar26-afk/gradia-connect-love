
-- Create external job listings table
CREATE TABLE public.external_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  job_type TEXT DEFAULT 'full-time',
  salary_range TEXT,
  experience_required TEXT,
  description TEXT,
  skills TEXT[] DEFAULT '{}',
  apply_url TEXT NOT NULL,
  company_logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can view active external jobs
CREATE POLICY "Anyone can view active external jobs"
ON public.external_jobs FOR SELECT
USING (is_active = true);

-- Admins/owners can manage external jobs
CREATE POLICY "Admins can manage external jobs"
ON public.external_jobs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_external_jobs_updated_at
BEFORE UPDATE ON public.external_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
