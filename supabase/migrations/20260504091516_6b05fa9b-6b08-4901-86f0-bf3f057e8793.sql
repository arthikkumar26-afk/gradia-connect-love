-- Helper function: is admin/owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('admin','owner','hr_manager')
  );
$$;

-- Helper: is HR (hr or hr_manager)
CREATE OR REPLACE FUNCTION public.is_hr_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('hr','hr_manager')
  );
$$;

-- Candidate -> Employer transfers
CREATE TABLE IF NOT EXISTS public.hr_candidate_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  employer_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, employer_id)
);
CREATE INDEX IF NOT EXISTS idx_hct_employer ON public.hr_candidate_transfers(employer_id);
CREATE INDEX IF NOT EXISTS idx_hct_candidate ON public.hr_candidate_transfers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hct_hr ON public.hr_candidate_transfers(hr_user_id);

ALTER TABLE public.hr_candidate_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can create candidate transfers"
ON public.hr_candidate_transfers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = hr_user_id AND public.is_hr_user(auth.uid()));

CREATE POLICY "Involved parties can view candidate transfers"
ON public.hr_candidate_transfers FOR SELECT
TO authenticated
USING (
  auth.uid() = hr_user_id
  OR auth.uid() = candidate_id
  OR auth.uid() = employer_id
  OR public.is_admin_or_owner(auth.uid())
);

CREATE POLICY "HR creator or admins can delete candidate transfers"
ON public.hr_candidate_transfers FOR DELETE
TO authenticated
USING (auth.uid() = hr_user_id OR public.is_admin_or_owner(auth.uid()));

-- Employer -> Candidate transfers
CREATE TABLE IF NOT EXISTS public.hr_employer_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_user_id uuid NOT NULL,
  employer_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_id, candidate_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_het_employer ON public.hr_employer_transfers(employer_id);
CREATE INDEX IF NOT EXISTS idx_het_candidate ON public.hr_employer_transfers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_het_hr ON public.hr_employer_transfers(hr_user_id);

ALTER TABLE public.hr_employer_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can create employer transfers"
ON public.hr_employer_transfers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = hr_user_id AND public.is_hr_user(auth.uid()));

CREATE POLICY "Involved parties can view employer transfers"
ON public.hr_employer_transfers FOR SELECT
TO authenticated
USING (
  auth.uid() = hr_user_id
  OR auth.uid() = candidate_id
  OR auth.uid() = employer_id
  OR public.is_admin_or_owner(auth.uid())
);

CREATE POLICY "HR creator or admins can delete employer transfers"
ON public.hr_employer_transfers FOR DELETE
TO authenticated
USING (auth.uid() = hr_user_id OR public.is_admin_or_owner(auth.uid()));