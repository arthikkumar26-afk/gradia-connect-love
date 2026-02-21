
-- Add freelancer and individual to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'freelancer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'individual';
