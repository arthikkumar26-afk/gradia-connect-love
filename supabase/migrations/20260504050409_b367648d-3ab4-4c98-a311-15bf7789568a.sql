-- Add hr_manager role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_manager';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['employer'::text, 'candidate'::text, 'sponsor'::text, 'admin'::text, 'owner'::text, 'freelancer'::text, 'edutech'::text, 'hr'::text, 'hr_manager'::text]));

-- Helper: check if user is hr_manager (full HR access)
CREATE OR REPLACE FUNCTION public.is_hr_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'hr_manager'
  );
$$;

-- Extend RLS so HR Managers see/manage all jobs and candidates (like admin for HR scope)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='jobs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "HR Manager views all jobs" ON public.jobs';
    EXECUTE 'CREATE POLICY "HR Manager views all jobs" ON public.jobs
      FOR SELECT USING (public.is_hr_manager(auth.uid()))';
    EXECUTE 'DROP POLICY IF EXISTS "HR Manager updates all jobs" ON public.jobs';
    EXECUTE 'CREATE POLICY "HR Manager updates all jobs" ON public.jobs
      FOR UPDATE USING (public.is_hr_manager(auth.uid()))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='interview_candidates') THEN
    EXECUTE 'DROP POLICY IF EXISTS "HR Manager views all candidates" ON public.interview_candidates';
    EXECUTE 'CREATE POLICY "HR Manager views all candidates" ON public.interview_candidates
      FOR SELECT USING (public.is_hr_manager(auth.uid()))';
    EXECUTE 'DROP POLICY IF EXISTS "HR Manager updates all candidates" ON public.interview_candidates';
    EXECUTE 'CREATE POLICY "HR Manager updates all candidates" ON public.interview_candidates
      FOR UPDATE USING (public.is_hr_manager(auth.uid()))';
  END IF;
END $$;

-- HR Manager can view all hr_employer_links
DROP POLICY IF EXISTS "HR Manager views all HR links" ON public.hr_employer_links;
CREATE POLICY "HR Manager views all HR links" ON public.hr_employer_links
  FOR SELECT USING (public.is_hr_manager(auth.uid()));