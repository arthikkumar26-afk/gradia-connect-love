-- Add category column to slot_bookings table to match admin question paper algorithm
ALTER TABLE public.slot_bookings
ADD COLUMN IF NOT EXISTS category TEXT;

-- Comment for clarity
COMMENT ON COLUMN public.slot_bookings.category IS 'Category selection for matching with question papers (e.g., Teaching, Board, Compititive)';