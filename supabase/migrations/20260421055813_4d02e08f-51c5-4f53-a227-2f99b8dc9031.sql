
-- Make sure the profile insert/update policies apply to the authenticated role
-- explicitly (the existing ones target "public" which can fail when the
-- session is still propagating during signup).

DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure anon role can also insert during the brief window before session is
-- fully attached (still restricted to matching id).
DROP POLICY IF EXISTS "Anon signup can insert own profile" ON public.profiles;
CREATE POLICY "Anon signup can insert own profile"
ON public.profiles
FOR INSERT
TO anon
WITH CHECK (auth.uid() = id);

-- Auto-create profile + role via trigger so signup succeeds even if the
-- client-side upsert is blocked. Function already exists (handle_new_user).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
