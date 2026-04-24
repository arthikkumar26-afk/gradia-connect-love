ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_review'::text, 'reviewed'::text, 'shortlisted'::text, 'interview'::text, 'offered'::text, 'rejected'::text, 'accepted'::text]));