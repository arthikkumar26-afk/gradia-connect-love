-- Drop the restrictive candidate policy that's causing issues
DROP POLICY IF EXISTS "Candidates can view active jobs" ON public.jobs;

-- The "Everyone can view active jobs" policy should be permissive, not restrictive
DROP POLICY IF EXISTS "Everyone can view active jobs" ON public.jobs;

-- Create a proper permissive policy for viewing active jobs
CREATE POLICY "Anyone can view active jobs" 
ON public.jobs 
FOR SELECT 
USING (status = 'active');