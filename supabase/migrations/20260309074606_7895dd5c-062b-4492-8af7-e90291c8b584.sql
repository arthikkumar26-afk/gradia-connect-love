
CREATE TABLE public.test_paper_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.interview_question_papers(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(paper_id, job_id)
);

ALTER TABLE public.test_paper_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage their own assignments"
ON public.test_paper_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.interview_question_papers p
    WHERE p.id = test_paper_assignments.paper_id
    AND p.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interview_question_papers p
    WHERE p.id = test_paper_assignments.paper_id
    AND p.created_by = auth.uid()
  )
);
