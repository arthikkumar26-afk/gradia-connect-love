-- Drop the foreign key constraint from profiles to auth.users
-- This allows employers to create candidate profiles via resume upload
-- without requiring candidates to have an auth account
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;