-- Mentor contact unlocks: records when a candidate spends points to reveal a mentor's contact info
CREATE TABLE public.mentor_contact_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  points_spent INTEGER NOT NULL DEFAULT 300,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, mentor_id)
);

ALTER TABLE public.mentor_contact_unlocks ENABLE ROW LEVEL SECURITY;

-- Candidate can see their own unlocks
CREATE POLICY "Candidates view own mentor unlocks"
ON public.mentor_contact_unlocks FOR SELECT
USING (auth.uid() = candidate_id);

-- Mentor can see who unlocked them (to know their earnings audience)
CREATE POLICY "Mentors view their unlocks"
ON public.mentor_contact_unlocks FOR SELECT
USING (auth.uid() = mentor_id);

-- Candidate creates the unlock for themselves
CREATE POLICY "Candidates create own unlock"
ON public.mentor_contact_unlocks FOR INSERT
WITH CHECK (auth.uid() = candidate_id);

CREATE INDEX idx_mentor_unlocks_candidate ON public.mentor_contact_unlocks(candidate_id);
CREATE INDEX idx_mentor_unlocks_mentor ON public.mentor_contact_unlocks(mentor_id);

-- Optional mentor-set price (defaults to 300 platform price). Stored on profile of the freelancer/mentor.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mentor_session_points INTEGER;