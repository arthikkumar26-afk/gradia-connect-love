
-- Backfill orphaned auth users into profiles
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT 
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  u.email,
  COALESCE(NULLIF(u.raw_user_meta_data->>'role', ''), 'candidate'),
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Also backfill user_roles for these users (so role-based queries work)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'role', ''), 'candidate')::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT DO NOTHING;

-- Create/replace handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_name text;
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'candidate');
  v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, full_name, email, role, created_at)
  VALUES (NEW.id, v_name, NEW.email, v_role, NOW())
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- ignore role enum mismatches
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
