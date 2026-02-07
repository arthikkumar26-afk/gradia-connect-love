
-- ============================================================
-- FIX 1: Interview Responses - Remove overly permissive policies
-- ============================================================

-- Drop the dangerous open INSERT/UPDATE policies
DROP POLICY IF EXISTS "Allow insert via edge function" ON public.interview_responses;
DROP POLICY IF EXISTS "Allow update via edge function" ON public.interview_responses;

-- Add proper service_role policies for edge functions (start-interview, submit-interview)
CREATE POLICY "Service role can insert responses"
  ON public.interview_responses FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update responses"
  ON public.interview_responses FOR UPDATE
  TO service_role
  USING (true);

-- Candidates can view their own interview responses
CREATE POLICY "Candidates can view their own responses"
  ON public.interview_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interview_events ie
      JOIN interview_candidates ic ON ic.id = ie.interview_candidate_id
      WHERE ie.id = interview_responses.interview_event_id
      AND ic.candidate_id = auth.uid()
    )
  );

-- Admins/owners can view all responses
CREATE POLICY "Admins can view all responses"
  ON public.interview_responses FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
  );

-- ============================================================
-- FIX 2: Profiles - Remove public data exposure during live demos
-- ============================================================

-- Drop the overly permissive public access policy
DROP POLICY IF EXISTS "Allow public access to candidate profiles for live demo viewing" ON public.profiles;

-- Create a security definer function that returns only safe fields for live demo viewing
CREATE OR REPLACE FUNCTION public.get_demo_candidate_profile(p_session_token TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  experience_level TEXT,
  preferred_role TEXT,
  profile_picture TEXT,
  primary_subject TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.experience_level,
    p.preferred_role,
    p.profile_picture,
    p.primary_subject
  FROM profiles p
  JOIN mock_interview_sessions mis ON mis.candidate_id = p.id
  WHERE mis.live_view_token = p_session_token
    AND mis.live_view_active = true
    AND mis.live_view_token IS NOT NULL
    AND p.role = 'candidate'
  LIMIT 1;
$$;
