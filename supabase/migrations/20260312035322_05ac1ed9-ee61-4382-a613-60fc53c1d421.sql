
-- Security definer function to check edutech role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_edutech_profile(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = 'edutech'
  );
$$;

-- Allow edutech users to view all candidate profiles
CREATE POLICY "EduTech can view candidate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'candidate' AND is_edutech_profile(auth.uid()));
