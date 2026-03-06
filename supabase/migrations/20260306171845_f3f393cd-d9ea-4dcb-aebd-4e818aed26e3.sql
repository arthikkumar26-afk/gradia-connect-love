
-- Table for chapter-wise question papers
CREATE TABLE public.chapter_wise_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  employer_id UUID NOT NULL,
  title TEXT NOT NULL,
  pdf_url TEXT,
  chapters JSONB DEFAULT '[]'::jsonb,
  sections_config JSONB DEFAULT '[]'::jsonb,
  generated_questions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  total_marks INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chapter_wise_papers ENABLE ROW LEVEL SECURITY;

-- Employers can manage their own papers
CREATE POLICY "Employers can manage own chapter papers"
  ON public.chapter_wise_papers
  FOR ALL
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Admin/owner can manage all
CREATE POLICY "Admin can manage all chapter papers"
  ON public.chapter_wise_papers
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Candidates can read active papers (for taking tests)
CREATE POLICY "Candidates can read active chapter papers"
  ON public.chapter_wise_papers
  FOR SELECT
  TO authenticated
  USING (is_active = true);
