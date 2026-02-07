-- Add program and classes columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS program TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS classes TEXT;