
CREATE TABLE IF NOT EXISTS public.hr_recommended_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_id uuid NOT NULL,
  employer_id uuid NOT NULL,
  job_id uuid,
  candidate_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hr_rec_emp_idx ON public.hr_recommended_candidates(employer_id);
CREATE INDEX IF NOT EXISTS hr_rec_job_idx ON public.hr_recommended_candidates(job_id);
CREATE UNIQUE INDEX IF NOT EXISTS hr_rec_unique ON public.hr_recommended_candidates(employer_id, COALESCE(job_id, '00000000-0000-0000-0000-000000000000'::uuid), candidate_id);

ALTER TABLE public.hr_recommended_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can insert recommendations"
ON public.hr_recommended_candidates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = hr_id AND public.is_hr_user(auth.uid()));

CREATE POLICY "HR and admins can view recommendations"
ON public.hr_recommended_candidates FOR SELECT TO authenticated
USING (
  public.is_hr_user(auth.uid())
  OR public.is_admin_or_owner(auth.uid())
  OR auth.uid() = employer_id
);

CREATE POLICY "HR can delete own recommendations"
ON public.hr_recommended_candidates FOR DELETE TO authenticated
USING (auth.uid() = hr_id);
