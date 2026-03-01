-- Add 'edutech' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'edutech';

-- Update the profiles role check constraint to include 'edutech'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['employer','candidate','sponsor','admin','owner','freelancer','edutech']));
