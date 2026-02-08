
-- Shift all stages from stage_order 5 onwards up by 1 to make room for Demo Feedback
UPDATE interview_stages SET stage_order = stage_order + 1 WHERE stage_order >= 5;

-- Insert Demo Feedback stage at stage_order 5 (between Demo Round at 4 and HR Round Slot Booking now at 6)
INSERT INTO interview_stages (name, stage_order, is_ai_automated)
VALUES ('Demo Feedback', 5, false);
