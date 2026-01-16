-- Allow authenticated users to upload question papers to the resumes bucket
CREATE POLICY "Allow authenticated uploads to question-papers folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = 'question-papers');

-- Allow public read access to question papers
CREATE POLICY "Allow public read access to question-papers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = 'question-papers');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates to question-papers folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = 'question-papers');

-- Allow authenticated users to delete from question-papers folder
CREATE POLICY "Allow authenticated deletes from question-papers folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = 'question-papers');