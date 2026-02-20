-- Allow candidates to delete their own mock interview stage results (for reset)
CREATE POLICY "Users can delete their own mock interview stage results"
ON public.mock_interview_stage_results
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM mock_interview_sessions
  WHERE mock_interview_sessions.id = mock_interview_stage_results.session_id
    AND mock_interview_sessions.candidate_id = auth.uid()
));