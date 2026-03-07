INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-attachments', 'campaign-attachments', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload campaign attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'campaign-attachments');
CREATE POLICY "Anyone can read campaign attachments" ON storage.objects FOR SELECT USING (bucket_id = 'campaign-attachments');
CREATE POLICY "Anyone can delete campaign attachments" ON storage.objects FOR DELETE USING (bucket_id = 'campaign-attachments');