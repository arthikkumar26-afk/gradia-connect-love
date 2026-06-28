
-- 1) interview_questions / interview_question_papers: drop public read, scope to assigned candidates
DROP POLICY IF EXISTS "Anyone can view active question papers" ON public.interview_question_papers;
DROP POLICY IF EXISTS "Anyone can view questions from active papers" ON public.interview_questions;

CREATE POLICY "Assigned candidates can view active question papers"
ON public.interview_question_papers
FOR SELECT TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.interview_candidates ic
    WHERE ic.job_id = interview_question_papers.job_id
      AND ic.candidate_id = auth.uid()
  )
);

CREATE POLICY "Assigned candidates can view questions from active papers"
ON public.interview_questions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.interview_question_papers iqp
    JOIN public.interview_candidates ic ON ic.job_id = iqp.job_id
    WHERE iqp.id = interview_questions.paper_id
      AND iqp.is_active = true
      AND ic.candidate_id = auth.uid()
  )
);

-- 2) Rewrite role helpers to read from user_roles (not profiles.role) so role self-update can't escalate
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_employer_profile(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'employer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_employer_by_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'employer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_hr_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('hr','hr_manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_hr_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'hr_manager'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_freelancer_profile(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'freelancer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_edutech_profile(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'edutech'
  );
$$;

-- Prevent role self-update on profiles
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- 3) management_reviews: drop the unrestricted token policy
DROP POLICY IF EXISTS "Anyone can update review via feedback token" ON public.management_reviews;

-- 4) ai_interview_sessions: drop anon-permissive insert/update policies
DROP POLICY IF EXISTS "Authenticated or service insert ai_interview_sessions" ON public.ai_interview_sessions;
DROP POLICY IF EXISTS "Authenticated or service update ai_interview_sessions" ON public.ai_interview_sessions;

CREATE POLICY "Candidates can insert their own AI interview sessions"
ON public.ai_interview_sessions
FOR INSERT TO authenticated
WITH CHECK (
  interview_candidate_id IN (
    SELECT id FROM public.interview_candidates WHERE candidate_id = auth.uid()
  )
);

-- 5) discount_coupons: restrict reads to authenticated
DROP POLICY IF EXISTS "Authenticated users can view active coupons" ON public.discount_coupons;
CREATE POLICY "Authenticated users can view active coupons"
ON public.discount_coupons
FOR SELECT TO authenticated
USING (is_active = true);

-- 6) resume_analyses: scope employer reads
DROP POLICY IF EXISTS "Employers can view candidate analyses" ON public.resume_analyses;
CREATE POLICY "Employers can view applicant analyses"
ON public.resume_analyses
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.interview_candidates ic
    JOIN public.jobs j ON j.id = ic.job_id
    WHERE ic.candidate_id = resume_analyses.user_id
      AND j.employer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = resume_analyses.user_id
      AND j.employer_id = auth.uid()
  )
);

-- 7) Storage policies
DROP POLICY IF EXISTS "Anyone can upload interview recordings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view demo videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view mock test recordings" ON storage.objects;

CREATE POLICY "Users can view their own demo videos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'demo-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all demo videos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'demo-videos'
  AND public.is_admin_or_owner(auth.uid())
);

CREATE POLICY "Users can view their own mock test recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mock-test-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all mock test recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mock-test-recordings'
  AND public.is_admin_or_owner(auth.uid())
);

-- 8) Revoke EXECUTE on internal trigger/utility functions from PUBLIC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_registration_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_resume_invites_accepted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_interview_candidate_timestamp() FROM PUBLIC, anon, authenticated;
