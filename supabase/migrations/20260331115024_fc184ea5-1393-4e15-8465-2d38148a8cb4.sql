-- Fix 1: Remove SECURITY DEFINER from employer_public_profiles view
DROP VIEW IF EXISTS public.employer_public_profiles;
CREATE VIEW public.employer_public_profiles AS
SELECT id, company_name, company_description, profile_picture, location, full_name
FROM profiles
WHERE role = 'employer';

-- Fix 2: Lock down mock_interview_pipeline_config RLS policies
DROP POLICY IF EXISTS "Authenticated users can delete pipeline config" ON public.mock_interview_pipeline_config;
DROP POLICY IF EXISTS "Authenticated users can insert pipeline config" ON public.mock_interview_pipeline_config;
DROP POLICY IF EXISTS "Authenticated users can update pipeline config" ON public.mock_interview_pipeline_config;
DROP POLICY IF EXISTS "Authenticated users can read pipeline config" ON public.mock_interview_pipeline_config;

CREATE POLICY "Only admins and owners can manage pipeline config"
  ON public.mock_interview_pipeline_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Authenticated users can read pipeline config"
  ON public.mock_interview_pipeline_config
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);