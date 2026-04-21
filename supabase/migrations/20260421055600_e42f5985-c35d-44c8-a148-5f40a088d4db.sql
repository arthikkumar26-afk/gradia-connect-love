
-- Allow users to insert their own non-privileged role during signup.
-- The "Prevent direct role modification" policy (USING false, FOR ALL) blocks all
-- writes including INSERT. We add a permissive INSERT policy for the user's own
-- row, restricted to non-privileged roles (cannot self-assign admin/owner).

CREATE POLICY "Users can insert their own non-privileged role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('candidate'::app_role, 'employer'::app_role, 'sponsor'::app_role, 'freelancer'::app_role, 'edutech'::app_role, 'individual'::app_role)
);
