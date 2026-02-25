-- Add video_url column to freelancer_portfolio_projects
ALTER TABLE public.freelancer_portfolio_projects ADD COLUMN IF NOT EXISTS video_url text;

-- Add media_urls column for multiple images
ALTER TABLE public.freelancer_portfolio_projects ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}'::text[];

-- Create storage bucket for portfolio media
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-media', 'portfolio-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload their own files
CREATE POLICY "Users can upload portfolio media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'portfolio-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: users can update their own files
CREATE POLICY "Users can update portfolio media" ON storage.objects
FOR UPDATE USING (bucket_id = 'portfolio-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: users can delete their own files
CREATE POLICY "Users can delete portfolio media" ON storage.objects
FOR DELETE USING (bucket_id = 'portfolio-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: anyone can view portfolio media (public)
CREATE POLICY "Anyone can view portfolio media" ON storage.objects
FOR SELECT USING (bucket_id = 'portfolio-media');