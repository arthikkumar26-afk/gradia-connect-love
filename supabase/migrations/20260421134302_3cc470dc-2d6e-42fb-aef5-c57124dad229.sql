ALTER TABLE public.mock_interview_sessions
  ADD COLUMN IF NOT EXISTS points_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_paid_at timestamptz;

-- Existing in-progress sessions are grandfathered in to avoid charging users twice
UPDATE public.mock_interview_sessions
  SET points_paid = true, points_paid_at = COALESCE(points_paid_at, now())
  WHERE points_paid = false;