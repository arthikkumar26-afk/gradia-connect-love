-- Drop and recreate the admin policy with explicit WITH CHECK for INSERT
DROP POLICY IF EXISTS "Admins and owners can manage question papers" ON public.interview_question_papers;

CREATE POLICY "Admins and owners can manage question papers"
ON public.interview_question_papers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Also ensure mock_interview_pipeline_config INSERT works for any authenticated user
DROP POLICY IF EXISTS "Authenticated users can insert pipeline config" ON public.mock_interview_pipeline_config;

CREATE POLICY "Authenticated users can insert pipeline config"
ON public.mock_interview_pipeline_config
FOR INSERT
TO authenticated
WITH CHECK (true);