-- Add AI question papers flag to jobs table
ALTER TABLE public.jobs ADD COLUMN use_ai_questions boolean NOT NULL DEFAULT false;