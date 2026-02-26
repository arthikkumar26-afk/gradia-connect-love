
-- Table for freelancers to express interest in outsource projects
CREATE TABLE public.project_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.outsource_projects(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL,
  cover_letter TEXT,
  proposed_budget NUMERIC,
  proposed_duration TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, freelancer_id)
);

-- Enable RLS
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;

-- Freelancers can manage their own proposals
CREATE POLICY "Freelancers can manage their own proposals"
  ON public.project_proposals FOR ALL
  USING (auth.uid() = freelancer_id)
  WITH CHECK (auth.uid() = freelancer_id);

-- Employers can view proposals for their projects
CREATE POLICY "Employers can view proposals for their projects"
  ON public.project_proposals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.outsource_projects op
    WHERE op.id = project_proposals.project_id AND op.employer_id = auth.uid()
  ));

-- Employers can update proposal status
CREATE POLICY "Employers can update proposal status"
  ON public.project_proposals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.outsource_projects op
    WHERE op.id = project_proposals.project_id AND op.employer_id = auth.uid()
  ));

-- Update the outsource_projects SELECT policy to allow employers to see their closed projects too
DROP POLICY IF EXISTS "Anyone can view active outsource projects" ON public.outsource_projects;
CREATE POLICY "Anyone can view active outsource projects"
  ON public.outsource_projects FOR SELECT
  USING (status = 'active' OR auth.uid() = employer_id);
