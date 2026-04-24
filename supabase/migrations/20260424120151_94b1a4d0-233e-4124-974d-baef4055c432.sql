CREATE POLICY "Candidates can view their own resume analysis audit logs"
ON public.resume_analysis_audit_logs
FOR SELECT
TO authenticated
USING (auth.uid() = candidate_id);