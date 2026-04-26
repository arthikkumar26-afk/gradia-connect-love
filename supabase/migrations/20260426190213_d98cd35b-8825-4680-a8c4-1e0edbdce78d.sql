CREATE TABLE public.external_job_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  external_job_id UUID NOT NULL REFERENCES public.external_jobs(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, external_job_id)
);

ALTER TABLE public.external_job_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates view own external job unlocks"
ON public.external_job_unlocks FOR SELECT
USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates create own external job unlocks"
ON public.external_job_unlocks FOR INSERT
WITH CHECK (auth.uid() = candidate_id);

CREATE INDEX idx_external_job_unlocks_candidate ON public.external_job_unlocks(candidate_id);