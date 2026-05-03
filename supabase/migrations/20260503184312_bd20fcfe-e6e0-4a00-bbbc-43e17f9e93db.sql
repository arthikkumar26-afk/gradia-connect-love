ALTER TABLE public.live_round_recordings
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_live_round_recordings_candidate ON public.live_round_recordings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_live_round_recordings_employer ON public.live_round_recordings(employer_id);
