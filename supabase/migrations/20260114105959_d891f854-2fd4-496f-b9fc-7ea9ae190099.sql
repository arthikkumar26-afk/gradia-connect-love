-- Add columns for quick registration data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS current_salary numeric,
ADD COLUMN IF NOT EXISTS expected_salary numeric,
ADD COLUMN IF NOT EXISTS available_from date;