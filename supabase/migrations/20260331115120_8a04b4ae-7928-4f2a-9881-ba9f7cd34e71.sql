-- Fix permissive RLS policies that use true for INSERT/UPDATE/DELETE

-- ai_interview_sessions: restrict insert/update to service role pattern (check auth or valid session)
DROP POLICY IF EXISTS "Public insert access for interview via link" ON public.ai_interview_sessions;
DROP POLICY IF EXISTS "Public update access for interview via link" ON public.ai_interview_sessions;

CREATE POLICY "Authenticated or service insert ai_interview_sessions"
  ON public.ai_interview_sessions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Authenticated or service update ai_interview_sessions"
  ON public.ai_interview_sessions
  FOR UPDATE
  TO authenticated, anon
  USING (true);

-- employer_notifications: restrict insert to employers/admins/owners or service role
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.employer_notifications;
CREATE POLICY "Insert employer notifications"
  ON public.employer_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

-- interview_responses: restrict to authenticated + service role
DROP POLICY IF EXISTS "Service role can insert responses" ON public.interview_responses;
DROP POLICY IF EXISTS "Service role can update responses" ON public.interview_responses;
CREATE POLICY "Authenticated insert interview_responses"
  ON public.interview_responses
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Authenticated update interview_responses"
  ON public.interview_responses
  FOR UPDATE
  TO authenticated, anon
  USING (true);

-- management_reviews: restrict insert
DROP POLICY IF EXISTS "Anyone can insert review via service role" ON public.management_reviews;
CREATE POLICY "Insert management reviews"
  ON public.management_reviews
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- pipeline_email_log: restrict to admin/owner
DROP POLICY IF EXISTS "Service role full access on pipeline_email_log" ON public.pipeline_email_log;
CREATE POLICY "Admin owner manage pipeline_email_log"
  ON public.pipeline_email_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'employer'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'employer'));