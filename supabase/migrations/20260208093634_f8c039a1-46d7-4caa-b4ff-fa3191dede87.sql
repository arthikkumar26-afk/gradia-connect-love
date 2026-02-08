-- Add observer_email column to slot_bookings for Demo Round observer
ALTER TABLE public.slot_bookings ADD COLUMN observer_email text DEFAULT NULL;

-- Add demo_meet_link column to store manual meeting link for Demo Round
ALTER TABLE public.slot_bookings ADD COLUMN demo_meet_link text DEFAULT NULL;

-- Add demo_meet_type column to store the meeting type (ai_video or manual_link)
ALTER TABLE public.slot_bookings ADD COLUMN demo_meet_type text DEFAULT 'ai_video';
