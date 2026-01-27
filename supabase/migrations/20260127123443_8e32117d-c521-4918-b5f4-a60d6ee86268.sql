-- Update all candidates that reference the AI Technical Interview stage
-- to point to Technical Assessment stage (next logical stage)
UPDATE public.interview_candidates
SET current_stage_id = '750effbe-1451-45f4-97ab-35e9902111e4'
WHERE current_stage_id = '261025d3-c8d9-4516-bb7a-3e396114fcec';

-- Update any interview_events that reference the AI Technical Interview stage
UPDATE public.interview_events
SET stage_id = '750effbe-1451-45f4-97ab-35e9902111e4'
WHERE stage_id = '261025d3-c8d9-4516-bb7a-3e396114fcec';

-- Delete the AI Technical Interview stage
DELETE FROM public.interview_stages
WHERE id = '261025d3-c8d9-4516-bb7a-3e396114fcec';

-- Re-order remaining stages to be sequential (1-6)
UPDATE public.interview_stages SET stage_order = 1 WHERE id = '4dd07970-8680-4f58-90fd-9e371122132e'; -- Resume Screening
UPDATE public.interview_stages SET stage_order = 2 WHERE id = '750effbe-1451-45f4-97ab-35e9902111e4'; -- Technical Assessment
UPDATE public.interview_stages SET stage_order = 3 WHERE id = '31dbf242-e061-47c7-8878-b9c7b7c286ee'; -- HR Round
UPDATE public.interview_stages SET stage_order = 4 WHERE id = 'ebd21942-2046-4172-96cd-c2440e9c4026'; -- Viva
UPDATE public.interview_stages SET stage_order = 5 WHERE id = '1eae0d09-7739-46f4-9876-b5d0f4179c53'; -- Final Review
UPDATE public.interview_stages SET stage_order = 6 WHERE id = '85eecda5-0276-4708-82c3-b7e95c89df1d'; -- Offer Stage