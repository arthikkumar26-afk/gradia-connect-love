-- Track interview unlocks (employer redeems points to take interviews with a candidate)
CREATE TABLE IF NOT EXISTS public.interview_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  interview_candidate_id uuid,
  points_spent integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_id, candidate_id)
);

ALTER TABLE public.interview_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can view their own interview unlocks"
  ON public.interview_unlocks FOR SELECT
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can create their own interview unlocks"
  ON public.interview_unlocks FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE INDEX IF NOT EXISTS idx_interview_unlocks_employer_candidate
  ON public.interview_unlocks (employer_id, candidate_id);