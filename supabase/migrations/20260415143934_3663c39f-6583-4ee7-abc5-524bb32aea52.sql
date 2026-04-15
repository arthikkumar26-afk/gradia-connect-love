
INSERT INTO public.interview_stages (name, stage_order, is_ai_automated)
VALUES 
  ('Instruction Mail', 1, true),
  ('Management Meet Slot Booking', 50, true),
  ('Management Meet', 51, false),
  ('Management Meet Feedback', 52, false),
  ('Written Test Feedback', 15, false)
ON CONFLICT DO NOTHING;
