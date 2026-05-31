CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_or_owner(auth.uid()))
WITH CHECK (public.is_admin_or_owner(auth.uid()));