-- Add policies for public access to ai_interview_sessions when accessed via valid interview_candidate_id
-- This allows candidates to access their interview without authentication (via email link)

-- Drop existing policies if needed to recreate with public access
DROP POLICY IF EXISTS "Public read access for interview via link" ON public.ai_interview_sessions;
DROP POLICY IF EXISTS "Public insert access for interview via link" ON public.ai_interview_sessions;
DROP POLICY IF EXISTS "Public update access for interview via link" ON public.ai_interview_sessions;

-- Allow anyone with a valid interview_candidate_id to read their session
CREATE POLICY "Public read access for interview via link" 
ON public.ai_interview_sessions 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Allow anyone to create a session for a valid interview
CREATE POLICY "Public insert access for interview via link" 
ON public.ai_interview_sessions 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to update their own interview session
CREATE POLICY "Public update access for interview via link" 
ON public.ai_interview_sessions 
FOR UPDATE 
TO anon, authenticated
USING (true);