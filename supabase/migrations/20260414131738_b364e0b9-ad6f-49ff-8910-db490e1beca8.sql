
-- Add missing interview stages that custom pipelines reference
INSERT INTO public.interview_stages (id, name, stage_order, is_ai_automated) VALUES
  (gen_random_uuid(), 'Written Test Feedback', 24, false),
  (gen_random_uuid(), 'Subject Demo Slot Booking', 25, true),
  (gen_random_uuid(), 'Panel Team Slot Booking', 26, true),
  (gen_random_uuid(), 'Panel Team', 27, false),
  (gen_random_uuid(), 'Panel Team Feedback', 28, false),
  (gen_random_uuid(), 'Panel Round Slot Booking', 29, true),
  (gen_random_uuid(), 'Panel Round', 30, false),
  (gen_random_uuid(), 'Panel Round Feedback', 31, false),
  (gen_random_uuid(), 'Demo Round Slot Booking', 32, true),
  (gen_random_uuid(), 'Demo Round Feedback', 33, false),
  (gen_random_uuid(), 'HR Round Feedback', 34, false),
  (gen_random_uuid(), 'HR Feedback', 35, false),
  (gen_random_uuid(), 'Senior Management Round Slot Booking', 36, true),
  (gen_random_uuid(), 'Senior Management Round', 37, false),
  (gen_random_uuid(), 'Senior Management Round Feedback', 38, false),
  (gen_random_uuid(), 'Core Team Round Feedback', 39, false)
ON CONFLICT DO NOTHING;
