CREATE TABLE public.interview_invitation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_title text,
  platform text NOT NULL,
  meeting_link text NOT NULL,
  scheduled_at text,
  subject text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_invitation_logs TO authenticated;
GRANT ALL ON public.interview_invitation_logs TO service_role;

ALTER TABLE public.interview_invitation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers read own invitation logs"
  ON public.interview_invitation_logs FOR SELECT
  USING (employer_id = auth.uid());

CREATE POLICY "Employers insert own invitation logs"
  ON public.interview_invitation_logs FOR INSERT
  WITH CHECK (employer_id = auth.uid());
