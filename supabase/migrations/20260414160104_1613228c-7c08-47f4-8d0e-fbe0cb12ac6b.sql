INSERT INTO public.interview_stages (id, name, stage_order, is_ai_automated) VALUES
  (gen_random_uuid(), 'Case Study Slot Booking', 40, true),
  (gen_random_uuid(), 'Case Study Round', 41, false),
  (gen_random_uuid(), 'Case Study Feedback', 42, false)
ON CONFLICT DO NOTHING;