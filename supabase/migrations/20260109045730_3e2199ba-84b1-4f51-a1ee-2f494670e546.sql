-- Drop the trigger that tries to insert into user_roles when a profile is created
-- This trigger fails for candidates added via resume upload who don't have auth accounts
DROP TRIGGER IF EXISTS on_profile_created_set_role ON public.profiles;