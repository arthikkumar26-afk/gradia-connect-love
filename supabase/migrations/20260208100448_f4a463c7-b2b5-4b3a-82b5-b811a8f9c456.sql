-- Shift existing stages to make room for HR Round Slot Booking at order 5
UPDATE public.interview_stages SET stage_order = 9 WHERE name = 'Offer Stage';
UPDATE public.interview_stages SET stage_order = 8 WHERE name = 'Final Review';
UPDATE public.interview_stages SET stage_order = 7 WHERE name = 'Viva';
UPDATE public.interview_stages SET stage_order = 6 WHERE name = 'HR Round';

-- Insert new HR Round Slot Booking stage
INSERT INTO public.interview_stages (name, stage_order, is_ai_automated)
VALUES ('HR Round Slot Booking', 5, true);