-- Recreate cv_unlocks (employer feature)
CREATE TABLE IF NOT EXISTS public.cv_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid,
  points_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_unlocks_employer ON public.cv_unlocks (employer_id);
CREATE INDEX IF NOT EXISTS idx_cv_unlocks_candidate ON public.cv_unlocks (candidate_id);

ALTER TABLE public.cv_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers view their unlocks"
  ON public.cv_unlocks FOR SELECT
  USING (auth.uid() = employer_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Employers create unlocks"
  ON public.cv_unlocks FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

-- Recreate interview_unlocks (employer feature)
CREATE TABLE IF NOT EXISTS public.interview_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  interview_candidate_id uuid,
  points_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_unlocks_employer ON public.interview_unlocks (employer_id);
CREATE INDEX IF NOT EXISTS idx_interview_unlocks_candidate ON public.interview_unlocks (candidate_id);

ALTER TABLE public.interview_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers view their interview unlocks"
  ON public.interview_unlocks FOR SELECT
  USING (auth.uid() = employer_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Employers create interview unlocks"
  ON public.interview_unlocks FOR INSERT
  WITH CHECK (auth.uid() = employer_id);