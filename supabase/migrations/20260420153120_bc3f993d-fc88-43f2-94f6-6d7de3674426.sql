-- Make resumes bucket public so existing public-style URLs work
UPDATE storage.buckets SET public = true WHERE id = 'resumes';

-- Ensure a public read policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Public read access for resumes'
  ) THEN
    CREATE POLICY "Public read access for resumes"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'resumes');
  END IF;
END $$;