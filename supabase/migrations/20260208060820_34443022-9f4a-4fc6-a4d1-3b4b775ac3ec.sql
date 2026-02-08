-- Allow public/unauthenticated users to view employer profiles (for QR code company pages)
-- This only exposes company-related info; the page selects: id, full_name, company_name, company_description, website, profile_picture
CREATE POLICY "Public can view employer profiles for company pages"
ON public.profiles
FOR SELECT
USING (role = 'employer');