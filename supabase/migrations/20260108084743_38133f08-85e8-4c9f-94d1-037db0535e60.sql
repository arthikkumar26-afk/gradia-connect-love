-- Make resumes bucket public for viewing
UPDATE storage.buckets 
SET public = true 
WHERE id = 'resumes';