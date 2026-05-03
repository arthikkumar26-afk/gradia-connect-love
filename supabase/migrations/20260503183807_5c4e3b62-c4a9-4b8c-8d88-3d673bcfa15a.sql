-- Live round recordings table
CREATE TABLE IF NOT EXISTS public.live_round_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_candidate_id uuid NOT NULL REFERENCES public.interview_candidates(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.interview_stages(id) ON DELETE SET NULL,
  stage_name text NOT NULL,
  recording_url text NOT NULL,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_round_recordings_ic ON public.live_round_recordings(interview_candidate_id);
CREATE INDEX IF NOT EXISTS idx_live_round_recordings_stage ON public.live_round_recordings(stage_id);

ALTER TABLE public.live_round_recordings ENABLE ROW LEVEL SECURITY;

-- Candidates can view & insert their own recordings
CREATE POLICY "Candidates view own live round recordings"
ON public.live_round_recordings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.interview_candidates ic
  WHERE ic.id = live_round_recordings.interview_candidate_id
    AND ic.candidate_id = auth.uid()
));

CREATE POLICY "Candidates insert own live round recordings"
ON public.live_round_recordings FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.interview_candidates ic
  WHERE ic.id = live_round_recordings.interview_candidate_id
    AND ic.candidate_id = auth.uid()
));

-- Employers (job owners) can view recordings of their candidates
CREATE POLICY "Employers view their candidates live round recordings"
ON public.live_round_recordings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.interview_candidates ic
  JOIN public.jobs j ON j.id = ic.job_id
  WHERE ic.id = live_round_recordings.interview_candidate_id
    AND j.employer_id = auth.uid()
));

-- Admins/owners can view all
CREATE POLICY "Admins view all live round recordings"
ON public.live_round_recordings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
