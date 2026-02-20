
-- Allow employers to view all candidate education details
CREATE POLICY "Employers can view all candidate qualifications"
ON public.educational_qualifications
FOR SELECT
USING (
  public.is_employer_profile(auth.uid())
);

-- Allow employers to view all candidate address details
CREATE POLICY "Employers can view all candidate addresses"
ON public.address_details
FOR SELECT
USING (
  public.is_employer_profile(auth.uid())
);

-- Allow employers to view all candidate family details
CREATE POLICY "Employers can view all candidate family"
ON public.family_details
FOR SELECT
USING (
  public.is_employer_profile(auth.uid())
);
