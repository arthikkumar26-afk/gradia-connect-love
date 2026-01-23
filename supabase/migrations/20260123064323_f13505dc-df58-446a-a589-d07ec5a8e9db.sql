-- Add AI Technical Interview stage to interview_stages if not exists
INSERT INTO public.interview_stages (name, stage_order, is_ai_automated)
SELECT 'AI Technical Interview', 2, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.interview_stages WHERE name = 'AI Technical Interview'
);

-- Update stage orders to accommodate new stage
UPDATE public.interview_stages SET stage_order = 3 WHERE name = 'Technical Assessment' AND stage_order = 2;
UPDATE public.interview_stages SET stage_order = 4 WHERE name = 'HR Round' AND stage_order = 3;
UPDATE public.interview_stages SET stage_order = 5 WHERE name = 'Final Review' AND stage_order = 4;
UPDATE public.interview_stages SET stage_order = 6 WHERE name = 'Offer Stage' AND stage_order = 5;

-- Create table to store AI interview sessions
CREATE TABLE IF NOT EXISTS public.ai_interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_candidate_id UUID NOT NULL REFERENCES public.interview_candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  questions JSONB DEFAULT '[]'::jsonb,
  answers JSONB DEFAULT '[]'::jsonb,
  recordings JSONB DEFAULT '[]'::jsonb,
  ai_evaluations JSONB DEFAULT '[]'::jsonb,
  overall_score NUMERIC(5,2),
  overall_feedback TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_interview_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_interview_sessions
CREATE POLICY "Candidates can view their own AI interview sessions"
  ON public.ai_interview_sessions
  FOR SELECT
  TO authenticated
  USING (
    interview_candidate_id IN (
      SELECT id FROM public.interview_candidates WHERE candidate_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can update their own AI interview sessions"
  ON public.ai_interview_sessions
  FOR UPDATE
  TO authenticated
  USING (
    interview_candidate_id IN (
      SELECT id FROM public.interview_candidates WHERE candidate_id = auth.uid()
    )
  );

CREATE POLICY "Employers can view AI interview sessions for their jobs"
  ON public.ai_interview_sessions
  FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE employer_id = auth.uid()
    )
  );

CREATE POLICY "Employers can manage AI interview sessions for their jobs"
  ON public.ai_interview_sessions
  FOR ALL
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE employer_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_ai_interview_sessions_updated_at
  BEFORE UPDATE ON public.ai_interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_ai_interview_sessions_candidate ON public.ai_interview_sessions(interview_candidate_id);
CREATE INDEX idx_ai_interview_sessions_job ON public.ai_interview_sessions(job_id);
CREATE INDEX idx_ai_interview_sessions_status ON public.ai_interview_sessions(status);