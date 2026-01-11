-- Create trending_jobs table to store popular job searches
CREATE TABLE public.trending_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_title TEXT NOT NULL,
  search_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trending_jobs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active trending jobs
CREATE POLICY "Anyone can view active trending jobs"
ON public.trending_jobs
FOR SELECT
USING (is_active = true);

-- Allow admins/owners to manage trending jobs
CREATE POLICY "Admins can manage trending jobs"
ON public.trending_jobs
FOR ALL
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

-- Insert some default trending jobs
INSERT INTO public.trending_jobs (job_title, search_count, display_order) VALUES
  ('React Developer', 1250, 1),
  ('Data Analyst', 980, 2),
  ('Product Manager', 875, 3),
  ('UX Designer', 720, 4),
  ('DevOps Engineer', 650, 5),
  ('Full Stack Developer', 590, 6),
  ('Machine Learning Engineer', 480, 7),
  ('Cloud Architect', 420, 8);