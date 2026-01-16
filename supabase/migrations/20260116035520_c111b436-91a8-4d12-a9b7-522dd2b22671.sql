-- Create mock interview sessions table for AI-powered interview practice
CREATE TABLE public.mock_interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_stage_order INTEGER NOT NULL DEFAULT 1,
  stages_completed JSONB DEFAULT '[]'::jsonb,
  overall_score NUMERIC(5,2) DEFAULT 0,
  overall_feedback TEXT,
  recording_url TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mock interview stage results table
CREATE TABLE public.mock_interview_stage_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  questions JSONB DEFAULT '[]'::jsonb,
  answers JSONB DEFAULT '[]'::jsonb,
  ai_score NUMERIC(5,2) DEFAULT 0,
  ai_feedback TEXT,
  passed BOOLEAN DEFAULT false,
  time_taken_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mock_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interview_stage_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_interview_sessions
CREATE POLICY "Users can view their own mock interview sessions" 
ON public.mock_interview_sessions 
FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Users can create their own mock interview sessions" 
ON public.mock_interview_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Users can update their own mock interview sessions" 
ON public.mock_interview_sessions 
FOR UPDATE 
USING (auth.uid() = candidate_id);

-- RLS Policies for mock_interview_stage_results
CREATE POLICY "Users can view their own mock interview stage results" 
ON public.mock_interview_stage_results 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.mock_interview_sessions 
  WHERE id = mock_interview_stage_results.session_id 
  AND candidate_id = auth.uid()
));

CREATE POLICY "Users can create their own mock interview stage results" 
ON public.mock_interview_stage_results 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mock_interview_sessions 
  WHERE id = mock_interview_stage_results.session_id 
  AND candidate_id = auth.uid()
));

CREATE POLICY "Users can update their own mock interview stage results" 
ON public.mock_interview_stage_results 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.mock_interview_sessions 
  WHERE id = mock_interview_stage_results.session_id 
  AND candidate_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_mock_interview_sessions_updated_at
BEFORE UPDATE ON public.mock_interview_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();