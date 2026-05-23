
-- 1. ai_interview_sessions
DROP POLICY IF EXISTS "Public read access for interview via link" ON public.ai_interview_sessions;

-- 2. management_reviews
DROP POLICY IF EXISTS "Insert management reviews" ON public.management_reviews;
CREATE POLICY "Authenticated users can insert management reviews"
ON public.management_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. is_admin_or_owner: remove hr_manager
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('admin','owner')
  );
$function$;

-- 4. interview-recordings bucket
DROP POLICY IF EXISTS "Public read access for interview recordings" ON storage.objects;

-- 5. resumes bucket
DROP POLICY IF EXISTS "Public read access for resumes" ON storage.objects;

-- 6. management_team
DROP POLICY IF EXISTS "Allow reading active management team" ON public.management_team;
CREATE POLICY "Privileged users can read active management team"
ON public.management_team
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    public.is_admin_or_owner(auth.uid())
    OR public.is_employer_profile(auth.uid())
  )
);

-- 7. payment_transactions
DROP POLICY IF EXISTS "Service role inserts payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Service role updates payments" ON public.payment_transactions;

-- 8. interview_responses: scope via interview_events -> interview_candidates
DROP POLICY IF EXISTS "Authenticated insert interview_responses" ON public.interview_responses;
DROP POLICY IF EXISTS "Authenticated update interview_responses" ON public.interview_responses;

CREATE POLICY "Candidates can insert their own interview_responses"
ON public.interview_responses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interview_events ie
    JOIN public.interview_candidates ic ON ic.id = ie.interview_candidate_id
    WHERE ie.id = interview_responses.interview_event_id
      AND ic.candidate_id = auth.uid()
  )
);

CREATE POLICY "Candidates can update their own interview_responses"
ON public.interview_responses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.interview_events ie
    JOIN public.interview_candidates ic ON ic.id = ie.interview_candidate_id
    WHERE ie.id = interview_responses.interview_event_id
      AND ic.candidate_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interview_events ie
    JOIN public.interview_candidates ic ON ic.id = ie.interview_candidate_id
    WHERE ie.id = interview_responses.interview_event_id
      AND ic.candidate_id = auth.uid()
  )
);

-- 9. campaign-attachments bucket
DROP POLICY IF EXISTS "Anyone can read campaign attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload campaign attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete campaign attachments" ON storage.objects;

CREATE POLICY "Authenticated users can read campaign attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'campaign-attachments');

CREATE POLICY "Authenticated users can upload campaign attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campaign-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can delete their campaign attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'campaign-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 10. mentorship-docs
DROP POLICY IF EXISTS "Anyone can view mentorship docs" ON storage.objects;
CREATE POLICY "Authenticated users can view mentorship docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mentorship-docs');

-- 11. mock-test-recordings
DROP POLICY IF EXISTS "Users can upload mock test recordings" ON storage.objects;
CREATE POLICY "Users can upload their own mock test recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mock-test-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
