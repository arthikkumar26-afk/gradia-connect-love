-- Allow anonymous/public uploads to the 'public' folder in the resumes bucket
CREATE POLICY "Allow public uploads to public folder in resumes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND (storage.foldername(name))[1] = 'public'
);

-- Allow public read access to the 'public' folder in the resumes bucket
CREATE POLICY "Allow public read access to public folder in resumes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'resumes' AND (storage.foldername(name))[1] = 'public'
);