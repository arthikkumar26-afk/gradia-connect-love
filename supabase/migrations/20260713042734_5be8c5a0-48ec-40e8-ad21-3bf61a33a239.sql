-- Fix infinite recursion in profiles UPDATE policy caused by subselect on profiles

CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = public.get_profile_role(auth.uid())
);