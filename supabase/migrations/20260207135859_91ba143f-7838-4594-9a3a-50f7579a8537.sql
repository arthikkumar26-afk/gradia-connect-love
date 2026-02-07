-- Add organisation column to jobs table for storing school/college name
ALTER TABLE public.jobs ADD COLUMN organisation text;
