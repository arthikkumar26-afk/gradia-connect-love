-- Add Instruction Round as stage_order 0 (before Resume Screening at stage_order 1)
INSERT INTO public.interview_stages (name, stage_order, is_ai_automated)
VALUES ('Instruction Round', 0, false);