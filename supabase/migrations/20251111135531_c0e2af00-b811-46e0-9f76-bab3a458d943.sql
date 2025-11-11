-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('employer', 'candidate');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Update is_employer function to use new roles table
CREATE OR REPLACE FUNCTION public.is_employer(u_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(u_id, 'employer');
$$;

-- Create trigger function to set role on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert role from metadata into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles insert to populate user_roles
CREATE TRIGGER on_profile_created_set_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Update RLS policies to use role checks from user_roles table
DROP POLICY IF EXISTS "Employers can view candidate profiles" ON public.profiles;
CREATE POLICY "Employers can view candidate profiles"
  ON public.profiles
  FOR SELECT
  USING (
    (role = 'candidate'::text) AND public.has_role(auth.uid(), 'employer')
  );

DROP POLICY IF EXISTS "Candidates can view active jobs" ON public.jobs;
CREATE POLICY "Candidates can view active jobs"
  ON public.jobs
  FOR SELECT
  USING (
    (status = 'active'::text) AND public.has_role(auth.uid(), 'candidate')
  );

-- Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only allow role insertion via trigger or admin
CREATE POLICY "Prevent direct role modification"
  ON public.user_roles
  FOR ALL
  USING (false);

-- Drop and recreate storage policies for resumes bucket
DROP POLICY IF EXISTS "Users can upload their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Employers can view candidate resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON storage.objects;

CREATE POLICY "Users can upload their own resumes"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own resumes"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Employers can view candidate resumes"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'resumes' 
    AND public.has_role(auth.uid(), 'employer')
  );

CREATE POLICY "Users can delete their own resumes"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );