-- Remove duplicate rows (keep newest) before adding unique constraint
DELETE FROM public.mock_interview_stage_results a
USING public.mock_interview_stage_results b
WHERE a.session_id = b.session_id
  AND a.stage_order = b.stage_order
  AND a.created_at < b.created_at;

ALTER TABLE public.mock_interview_stage_results
  ADD CONSTRAINT mock_interview_stage_results_session_stage_unique
  UNIQUE (session_id, stage_order);