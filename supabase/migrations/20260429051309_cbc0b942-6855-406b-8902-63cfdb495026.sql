
-- Columns schema defined per employer (shared across all their HRs)
CREATE TABLE IF NOT EXISTS public.employer_hr_sheet_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_user_id UUID NOT NULL UNIQUE,
  columns JSONB NOT NULL DEFAULT '[
    {"key":"name","label":"Candidate Name","type":"text"},
    {"key":"email","label":"Email","type":"text"},
    {"key":"phone","label":"Phone","type":"text"},
    {"key":"skills","label":"Skills","type":"text"},
    {"key":"experience","label":"Experience","type":"text"},
    {"key":"status","label":"Status","type":"text"},
    {"key":"notes","label":"Notes","type":"text"}
  ]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employer_hr_sheet_columns ENABLE ROW LEVEL SECURITY;

-- Employer manages their own column schema
CREATE POLICY "Employer manages own columns"
ON public.employer_hr_sheet_columns
FOR ALL
USING (auth.uid() = employer_user_id)
WITH CHECK (auth.uid() = employer_user_id);

-- HR can read columns of their linked employer
CREATE POLICY "HR can view linked employer columns"
ON public.employer_hr_sheet_columns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hr_employer_links
    WHERE hr_user_id = auth.uid()
      AND employer_user_id = employer_hr_sheet_columns.employer_user_id
      AND is_active = true
  )
);

CREATE TRIGGER update_employer_hr_sheet_columns_updated_at
BEFORE UPDATE ON public.employer_hr_sheet_columns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Per-HR sheet rows
CREATE TABLE IF NOT EXISTS public.hr_candidate_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_user_id UUID NOT NULL,
  employer_user_id UUID NOT NULL,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hr_user_id, employer_user_id)
);

ALTER TABLE public.hr_candidate_sheets ENABLE ROW LEVEL SECURITY;

-- HR manages own sheet
CREATE POLICY "HR manages own sheet"
ON public.hr_candidate_sheets
FOR ALL
USING (auth.uid() = hr_user_id)
WITH CHECK (auth.uid() = hr_user_id);

-- Employer can view sheets for their company
CREATE POLICY "Employer can view HR sheets"
ON public.hr_candidate_sheets
FOR SELECT
USING (auth.uid() = employer_user_id);

CREATE TRIGGER update_hr_candidate_sheets_updated_at
BEFORE UPDATE ON public.hr_candidate_sheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_hr_candidate_sheets_employer ON public.hr_candidate_sheets(employer_user_id);
