-- Make interview-recordings bucket public for video playback
UPDATE storage.buckets 
SET public = true 
WHERE id = 'interview-recordings';

-- Create policy for public read access
CREATE POLICY "Public read access for interview recordings" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'interview-recordings');

-- Create policy for authenticated upload
CREATE POLICY "Anyone can upload interview recordings" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'interview-recordings');