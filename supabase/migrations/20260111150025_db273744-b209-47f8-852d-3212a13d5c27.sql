-- Update stage orders to make room for Viva stage (inserting at position 5)
UPDATE public.interview_stages SET stage_order = 7 WHERE name = 'Offer Stage';
UPDATE public.interview_stages SET stage_order = 6 WHERE name = 'Final Review';

-- Insert Viva stage at position 5 (after HR Round, before Final Review)
INSERT INTO public.interview_stages (name, stage_order, is_ai_automated)
VALUES ('Viva', 5, false);