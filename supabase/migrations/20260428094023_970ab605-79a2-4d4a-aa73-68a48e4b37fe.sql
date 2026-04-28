
-- 1. Add 'hr' to enum and role check
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['employer'::text, 'candidate'::text, 'sponsor'::text, 'admin'::text, 'owner'::text, 'freelancer'::text, 'edutech'::text, 'hr'::text]));

-- 2. HR -> Employer link table
CREATE TABLE IF NOT EXISTS public.hr_employer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_user_id UUID NOT NULL UNIQUE,
  employer_user_id UUID NOT NULL,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{"post_jobs":true,"manage_candidates":true,"schedule_interviews":true,"view_jobs":true,"billing":false,"company_settings":false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_employer_links_employer ON public.hr_employer_links(employer_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employer_links_hr ON public.hr_employer_links(hr_user_id);

ALTER TABLE public.hr_employer_links ENABLE ROW LEVEL SECURITY;

-- Helper: get employer parent of an HR user
CREATE OR REPLACE FUNCTION public.get_hr_parent_employer(_hr_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT employer_user_id FROM public.hr_employer_links
  WHERE hr_user_id = _hr_user_id AND is_active = true
  LIMIT 1;
$$;

-- Policies
DROP POLICY IF EXISTS "HR can view own link" ON public.hr_employer_links;
CREATE POLICY "HR can view own link" ON public.hr_employer_links
  FOR SELECT USING (hr_user_id = auth.uid());

DROP POLICY IF EXISTS "Employer views own HR links" ON public.hr_employer_links;
CREATE POLICY "Employer views own HR links" ON public.hr_employer_links
  FOR SELECT USING (employer_user_id = auth.uid());

DROP POLICY IF EXISTS "Employer manages own HR links" ON public.hr_employer_links;
CREATE POLICY "Employer manages own HR links" ON public.hr_employer_links
  FOR ALL USING (employer_user_id = auth.uid())
  WITH CHECK (employer_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage HR links" ON public.hr_employer_links;
CREATE POLICY "Admins manage HR links" ON public.hr_employer_links
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_hr_links_updated_at ON public.hr_employer_links;
CREATE TRIGGER trg_hr_links_updated_at
  BEFORE UPDATE ON public.hr_employer_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Extend RLS on jobs so linked HR can see/manage parent employer's jobs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='jobs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "HR views parent employer jobs" ON public.jobs';
    EXECUTE 'CREATE POLICY "HR views parent employer jobs" ON public.jobs
      FOR SELECT USING (employer_id = public.get_hr_parent_employer(auth.uid()))';

    EXECUTE 'DROP POLICY IF EXISTS "HR posts jobs for parent employer" ON public.jobs';
    EXECUTE 'CREATE POLICY "HR posts jobs for parent employer" ON public.jobs
      FOR INSERT WITH CHECK (employer_id = public.get_hr_parent_employer(auth.uid()))';

    EXECUTE 'DROP POLICY IF EXISTS "HR updates parent employer jobs" ON public.jobs';
    EXECUTE 'CREATE POLICY "HR updates parent employer jobs" ON public.jobs
      FOR UPDATE USING (employer_id = public.get_hr_parent_employer(auth.uid()))';
  END IF;
END $$;

-- 4. interview_candidates visibility for HR
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='interview_candidates') THEN
    EXECUTE 'DROP POLICY IF EXISTS "HR views parent employer candidates" ON public.interview_candidates';
    EXECUTE 'CREATE POLICY "HR views parent employer candidates" ON public.interview_candidates
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.jobs j
                WHERE j.id = interview_candidates.job_id
                  AND j.employer_id = public.get_hr_parent_employer(auth.uid()))
      )';

    EXECUTE 'DROP POLICY IF EXISTS "HR updates parent employer candidates" ON public.interview_candidates';
    EXECUTE 'CREATE POLICY "HR updates parent employer candidates" ON public.interview_candidates
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.jobs j
                WHERE j.id = interview_candidates.job_id
                  AND j.employer_id = public.get_hr_parent_employer(auth.uid()))
      )';
  END IF;
END $$;
