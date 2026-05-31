
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS govt_id_type text,
  ADD COLUMN IF NOT EXISTS govt_id_number text,
  ADD COLUMN IF NOT EXISTS govt_id_url text,
  ADD COLUMN IF NOT EXISTS govt_id_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS govt_id_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS govt_id_verified_at timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('govt-id-documents', 'govt-id-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own govt id" ON storage.objects;
DROP POLICY IF EXISTS "Users read own govt id" ON storage.objects;
DROP POLICY IF EXISTS "Users update own govt id" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own govt id" ON storage.objects;
DROP POLICY IF EXISTS "Admins read all govt id" ON storage.objects;

CREATE POLICY "Users upload own govt id" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'govt-id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own govt id" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'govt-id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own govt id" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'govt-id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own govt id" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'govt-id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all govt id" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'govt-id-documents' AND public.is_admin_or_owner(auth.uid()));
