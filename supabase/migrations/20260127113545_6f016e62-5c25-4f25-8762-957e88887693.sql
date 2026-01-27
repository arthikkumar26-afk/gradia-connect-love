-- First update all candidates that reference the old AI Phone Interview stage
-- to point to the AI Technical Interview stage
UPDATE public.interview_candidates
SET current_stage_id = '261025d3-c8d9-4516-bb7a-3e396114fcec'
WHERE current_stage_id = '1d475712-964a-414e-b764-a5e67b72def5';

-- Also update any interview_events that reference the old stage
UPDATE public.interview_events
SET stage_id = '261025d3-c8d9-4516-bb7a-3e396114fcec'
WHERE stage_id = '1d475712-964a-414e-b764-a5e67b72def5';

-- Now delete the old AI Phone Interview stage
DELETE FROM public.interview_stages
WHERE id = '1d475712-964a-414e-b764-a5e67b72def5';

-- Fix duplicate stage_order - make AI Technical Interview order 2
UPDATE public.interview_stages
SET stage_order = 2
WHERE id = '261025d3-c8d9-4516-bb7a-3e396114fcec';