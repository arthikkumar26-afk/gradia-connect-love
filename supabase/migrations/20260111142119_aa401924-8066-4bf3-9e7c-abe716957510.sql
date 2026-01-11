-- Add date_of_birth, gender, and languages columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN date_of_birth date NULL,
ADD COLUMN gender text NULL,
ADD COLUMN languages text[] NULL;