-- Create table for viva evaluation criteria/rubrics
CREATE TABLE public.viva_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  max_score INTEGER NOT NULL DEFAULT 10,
  weight NUMERIC DEFAULT 1.0,
  category TEXT DEFAULT 'general',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for viva evaluations (scores per candidate per criteria)
CREATE TABLE public.viva_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_candidate_id UUID NOT NULL REFERENCES public.interview_candidates(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.viva_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  notes TEXT,
  evaluator_name TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(interview_candidate_id, criteria_id)
);

-- Create table for overall viva session summary
CREATE TABLE public.viva_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_candidate_id UUID NOT NULL REFERENCES public.interview_candidates(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  overall_score NUMERIC,
  overall_feedback TEXT,
  recommendation TEXT CHECK (recommendation IN ('strong_hire', 'hire', 'maybe', 'no_hire')),
  evaluator_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.viva_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for viva_criteria
CREATE POLICY "Employers can manage their viva criteria"
ON public.viva_criteria FOR ALL
USING (auth.uid() = employer_id);

-- RLS Policies for viva_evaluations
CREATE POLICY "Employers can manage evaluations for their candidates"
ON public.viva_evaluations FOR ALL
USING (EXISTS (
  SELECT 1 FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.id = viva_evaluations.interview_candidate_id
  AND j.employer_id = auth.uid()
));

-- RLS Policies for viva_sessions
CREATE POLICY "Employers can manage viva sessions for their candidates"
ON public.viva_sessions FOR ALL
USING (EXISTS (
  SELECT 1 FROM interview_candidates ic
  JOIN jobs j ON j.id = ic.job_id
  WHERE ic.id = viva_sessions.interview_candidate_id
  AND j.employer_id = auth.uid()
));

CREATE POLICY "Candidates can view their viva sessions"
ON public.viva_sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM interview_candidates ic
  WHERE ic.id = viva_sessions.interview_candidate_id
  AND ic.candidate_id = auth.uid()
));