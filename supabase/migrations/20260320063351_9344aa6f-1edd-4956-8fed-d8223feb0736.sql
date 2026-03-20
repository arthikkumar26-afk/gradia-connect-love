
-- 1. Replace the overly permissive increment_coupon_usage function with a safe version
-- that validates coupon limits before incrementing
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_total_uses integer;
  v_total_used integer;
  v_is_active boolean;
  v_valid_until timestamptz;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT max_total_uses, total_used, is_active, valid_until
  INTO v_max_total_uses, v_total_used, v_is_active, v_valid_until
  FROM public.discount_coupons
  WHERE id = coupon_id_input
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon not found';
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Coupon is not active';
  END IF;

  IF v_valid_until IS NOT NULL AND v_valid_until < now() THEN
    RAISE EXCEPTION 'Coupon has expired';
  END IF;

  IF v_max_total_uses IS NOT NULL AND v_total_used >= v_max_total_uses THEN
    RAISE EXCEPTION 'Coupon usage limit reached';
  END IF;

  UPDATE public.discount_coupons
  SET total_used = total_used + 1
  WHERE id = coupon_id_input;
END;
$$;

-- 2. Fix employer profile data exposure - replace overly permissive public policy
-- Drop the existing policy that exposes all employer fields
DROP POLICY IF EXISTS "Public can view employer profiles for company pages" ON public.profiles;

-- Create a restricted policy - public can only see employer profiles but code must select safe fields
-- We'll use a view for safe public access
CREATE OR REPLACE VIEW public.employer_public_profiles AS
SELECT
  id,
  company_name,
  company_description,
  profile_picture,
  location,
  full_name
FROM public.profiles
WHERE role = 'employer';

GRANT SELECT ON public.employer_public_profiles TO anon, authenticated;

-- Re-create a more restrictive policy for the profiles table
-- Authenticated users who are employers can still see other employer profiles (for directory)
CREATE POLICY "Authenticated users can view employer basic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'employer'
  OR id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- 3. Make sensitive storage buckets private
UPDATE storage.buckets SET public = false WHERE id = 'resumes';
UPDATE storage.buckets SET public = false WHERE id = 'interview-recordings';
UPDATE storage.buckets SET public = false WHERE id = 'demo-videos';
UPDATE storage.buckets SET public = false WHERE id = 'mock-test-recordings';
