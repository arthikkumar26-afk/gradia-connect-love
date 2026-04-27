ALTER TABLE public.cv_unlocks ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cv_unlocks_application_id ON public.cv_unlocks(application_id);
CREATE INDEX IF NOT EXISTS idx_cv_unlocks_employer_job ON public.cv_unlocks(employer_id, job_id);