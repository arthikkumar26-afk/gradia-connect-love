
CREATE TABLE public.cv_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  job_id UUID,
  points_spent INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (employer_id, candidate_id, job_id)
);

ALTER TABLE public.cv_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can view their own unlocks"
ON public.cv_unlocks FOR SELECT
USING (auth.uid() = employer_id);

CREATE POLICY "Employers can create their own unlocks"
ON public.cv_unlocks FOR INSERT
WITH CHECK (auth.uid() = employer_id);

CREATE INDEX idx_cv_unlocks_employer ON public.cv_unlocks(employer_id);
CREATE INDEX idx_cv_unlocks_candidate ON public.cv_unlocks(candidate_id);
