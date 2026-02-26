
CREATE TABLE public.outsource_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  duration TEXT,
  skills TEXT[] DEFAULT '{}'::TEXT[],
  deliverables TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outsource_projects ENABLE ROW LEVEL SECURITY;

-- Employers can manage their own projects
CREATE POLICY "Employers can manage their own outsource projects"
  ON public.outsource_projects FOR ALL
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

-- Freelancers can view active projects
CREATE POLICY "Anyone can view active outsource projects"
  ON public.outsource_projects FOR SELECT
  USING (status = 'active');
