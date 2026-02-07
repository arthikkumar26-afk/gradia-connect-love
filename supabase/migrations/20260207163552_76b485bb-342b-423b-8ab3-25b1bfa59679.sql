
-- Add dynamic job creation fields to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS sector_division text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS function_type text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS segment text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS designation text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS subjects text;
