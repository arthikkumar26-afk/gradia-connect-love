-- Create storage bucket for interview recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-recordings', 'interview-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for employers to view recordings of their candidates
CREATE POLICY "Employers can view their candidates recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'interview-recordings' AND
  EXISTS (
    SELECT 1 FROM interview_candidates ic
    JOIN jobs j ON j.id = ic.job_id
    WHERE (storage.foldername(name))[1] = ic.id::text
    AND j.employer_id = auth.uid()
  )
);

-- RLS policy for candidates to upload their own recordings
CREATE POLICY "Candidates can upload their recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'interview-recordings' AND
  EXISTS (
    SELECT 1 FROM interview_invitations ii
    JOIN interview_events ie ON ie.id = ii.interview_event_id
    JOIN interview_candidates ic ON ic.id = ie.interview_candidate_id
    WHERE (storage.foldername(name))[1] = ic.id::text
    AND ii.invitation_token = (storage.foldername(name))[2]
  )
);

-- Create table for interview questions and responses
CREATE TABLE public.interview_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_event_id UUID NOT NULL REFERENCES public.interview_events(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]',
  answers JSONB NOT NULL DEFAULT '[]',
  score NUMERIC,
  total_questions INTEGER NOT NULL DEFAULT 5,
  correct_answers INTEGER DEFAULT 0,
  time_taken_seconds INTEGER,
  recording_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;

-- Employers can view responses for their candidates
CREATE POLICY "Employers can view interview responses"
ON public.interview_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM interview_events ie
    JOIN interview_candidates ic ON ic.id = ie.interview_candidate_id
    JOIN jobs j ON j.id = ic.job_id
    WHERE ie.id = interview_responses.interview_event_id
    AND j.employer_id = auth.uid()
  )
);

-- Public insert for candidates taking interview (via token validation in edge function)
CREATE POLICY "Allow insert via edge function"
ON public.interview_responses FOR INSERT
WITH CHECK (true);

-- Allow update for completing interview
CREATE POLICY "Allow update via edge function"
ON public.interview_responses FOR UPDATE
USING (true);