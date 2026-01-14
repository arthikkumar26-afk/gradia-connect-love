-- Create function for updating timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for mock test sessions
CREATE TABLE public.mock_test_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_questions INTEGER NOT NULL DEFAULT 10,
  correct_answers INTEGER DEFAULT 0,
  score NUMERIC(5,2) DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT 0,
  questions JSONB DEFAULT '[]'::jsonb,
  answers JSONB DEFAULT '[]'::jsonb,
  recording_url TEXT,
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mock_test_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for candidates to view/manage their own mock tests
CREATE POLICY "Candidates can view their own mock tests"
ON public.mock_test_sessions
FOR SELECT
USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can create their own mock tests"
ON public.mock_test_sessions
FOR INSERT
WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Candidates can update their own mock tests"
ON public.mock_test_sessions
FOR UPDATE
USING (auth.uid() = candidate_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_mock_test_sessions_updated_at
BEFORE UPDATE ON public.mock_test_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for mock test recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mock-test-recordings', 'mock-test-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for mock test recordings
CREATE POLICY "Users can upload mock test recordings"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'mock-test-recordings');

CREATE POLICY "Anyone can view mock test recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'mock-test-recordings');