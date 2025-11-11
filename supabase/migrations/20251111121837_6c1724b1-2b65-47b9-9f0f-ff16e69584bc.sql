-- Remove policies that reference auth.users to fix permission errors
DROP POLICY IF EXISTS "Candidates can view employer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view candidate profiles" ON public.profiles;

-- Create a SECURITY DEFINER helper to safely check employer role without recursion
CREATE OR REPLACE FUNCTION public.is_employer(u_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'employer'
  );
$$;

-- Allow authenticated users to view employer profiles (no PII risk for companies)
CREATE POLICY "Employer profiles viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'employer');

-- Allow employers to view candidate profiles using the helper (no auth.users reference)
CREATE POLICY "Employers can view candidate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'candidate' AND public.is_employer(auth.uid()));