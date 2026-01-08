-- Add policy for candidates to insert their own interview records (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interview_candidates' 
    AND policyname = 'Candidates can insert their own interview records'
  ) THEN
    CREATE POLICY "Candidates can insert their own interview records"
    ON interview_candidates FOR INSERT
    WITH CHECK (candidate_id = auth.uid());
  END IF;
END $$;