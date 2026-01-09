-- Add interview_type column to jobs table to define interview method per position
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS interview_type text DEFAULT 'standard';

-- Add comment for clarity
COMMENT ON COLUMN public.jobs.interview_type IS 'Interview type: standard (MCQ-based), education (includes Demo Video), technical, etc.';

-- Create storage bucket for demo/teaching videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('demo-videos', 'demo-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for demo videos
CREATE POLICY "Anyone can view demo videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'demo-videos');

CREATE POLICY "Authenticated users can upload demo videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'demo-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own demo videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'demo-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own demo videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'demo-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add demo_video_url column to interview_responses to store teaching demo videos
ALTER TABLE public.interview_responses
ADD COLUMN IF NOT EXISTS demo_video_url text;