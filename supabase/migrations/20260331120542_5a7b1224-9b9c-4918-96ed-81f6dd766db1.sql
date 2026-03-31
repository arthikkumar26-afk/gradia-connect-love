
-- Fix 1: Remove public read policy on interview_candidates
DROP POLICY IF EXISTS "Public read access for slot booking links" ON public.interview_candidates;

-- Add admin/owner read access for interview_candidates
CREATE POLICY "Admins and owners can view all interview candidates"
  ON public.interview_candidates
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Fix 2: Remove overly permissive storage policy on resumes bucket
DROP POLICY IF EXISTS "Public can read user resumes" ON storage.objects;

-- Add owner-scoped read policy for resumes
CREATE POLICY "Users can read their own resumes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add employer read policy for resumes (employers with candidates in their jobs)
CREATE POLICY "Employers can read candidate resumes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND EXISTS (
      SELECT 1 FROM public.interview_candidates ic
      JOIN public.jobs j ON j.id = ic.job_id
      WHERE j.employer_id = auth.uid()
        AND ic.candidate_id::text = (storage.foldername(name))[1]
    )
  );

-- Admin/owner can read all resumes
CREATE POLICY "Admins can read all resumes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  );

-- Fix 3: Remove permissive live_view_token policy on mock_interview_sessions
DROP POLICY IF EXISTS "Allow public access with valid live_view_token" ON public.mock_interview_sessions;

-- Create secure RPC function for live view token lookup
CREATE OR REPLACE FUNCTION public.get_session_by_live_token(p_token text)
RETURNS TABLE (
  id uuid,
  status text,
  live_view_active boolean,
  live_stream_started_at timestamptz,
  candidate_id uuid,
  current_stage_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.status,
    s.live_view_active,
    s.live_stream_started_at,
    s.candidate_id,
    s.current_stage_order
  FROM public.mock_interview_sessions s
  WHERE s.live_view_token = p_token
    AND s.live_view_active = true
    AND s.live_view_token IS NOT NULL
  LIMIT 1;
$$;
