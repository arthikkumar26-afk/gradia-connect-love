
-- Shift all stages after CV/Resume (stage_order >= 2) up by 1
UPDATE public.interview_stages SET stage_order = stage_order + 1 WHERE stage_order >= 2;

-- Insert the new "Written Test Slot Booking" stage at order 2
INSERT INTO public.interview_stages (name, stage_order, is_ai_automated)
VALUES ('Written Test Slot Booking', 2, true);
