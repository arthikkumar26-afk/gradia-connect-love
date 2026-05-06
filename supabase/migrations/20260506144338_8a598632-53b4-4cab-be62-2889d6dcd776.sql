
CREATE TABLE IF NOT EXISTS public.candidate_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'job_alert',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  job_id UUID,
  job_title TEXT,
  employer_name TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_candidate
  ON public.candidate_notifications(candidate_id, created_at DESC);

ALTER TABLE public.candidate_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own notifications"
  ON public.candidate_notifications FOR SELECT
  TO authenticated
  USING (candidate_id = auth.uid());

CREATE POLICY "Candidates can update own notifications"
  ON public.candidate_notifications FOR UPDATE
  TO authenticated
  USING (candidate_id = auth.uid());

CREATE POLICY "Staff can insert candidate notifications"
  ON public.candidate_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR is_hr_user(auth.uid())
    OR is_employer_profile(auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_notifications;
