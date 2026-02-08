
-- First, shift existing stages up by 2 to make room for the new stages
-- HR Round: 3 → 5
-- Viva: 4 → 6  
-- Final Review: 5 → 7
-- Offer Stage: 6 → 8

-- Use a temporary high number to avoid unique constraint conflicts
UPDATE interview_stages SET stage_order = 105 WHERE name = 'HR Round';
UPDATE interview_stages SET stage_order = 106 WHERE name = 'Viva';
UPDATE interview_stages SET stage_order = 107 WHERE name = 'Final Review';
UPDATE interview_stages SET stage_order = 108 WHERE name = 'Offer Stage';

-- Now set the correct values
UPDATE interview_stages SET stage_order = 5 WHERE name = 'HR Round';
UPDATE interview_stages SET stage_order = 6 WHERE name = 'Viva';
UPDATE interview_stages SET stage_order = 7 WHERE name = 'Final Review';
UPDATE interview_stages SET stage_order = 8 WHERE name = 'Offer Stage';

-- Insert the two new stages
INSERT INTO interview_stages (name, stage_order, is_ai_automated)
VALUES 
  ('Demo Slot Booking', 3, true),
  ('Demo Round', 4, false);
