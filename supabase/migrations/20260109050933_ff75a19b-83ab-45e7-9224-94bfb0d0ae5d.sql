-- Drop the existing policy that requires has_role check
DROP POLICY IF EXISTS "Employers can view candidate profiles" ON public.profiles;

-- Create a simpler policy that allows authenticated employers (by checking profiles.role) to view candidate profiles
CREATE POLICY "Employers can view candidate profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'candidate'::text 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'employer'
  )
);