-- Fix Security Definer View: recreate with security_invoker = true
DROP VIEW IF EXISTS public.employer_public_profiles;
CREATE VIEW public.employer_public_profiles
WITH (security_invoker = true)
AS
SELECT id, company_name, company_description, profile_picture, location, full_name
FROM profiles
WHERE role = 'employer';