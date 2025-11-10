-- Drop the recursive RLS policies on profiles table
DROP POLICY IF EXISTS "Candidates can view all employer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view all candidate profiles" ON public.profiles;

-- Create non-recursive policies for cross-role viewing
-- Employers can view candidate profiles (without recursion)
CREATE POLICY "Employers can view candidate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'candidate' 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'employer'
  )
);

-- Candidates can view employer profiles (without recursion)
CREATE POLICY "Candidates can view employer profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'employer' 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'candidate'
  )
);