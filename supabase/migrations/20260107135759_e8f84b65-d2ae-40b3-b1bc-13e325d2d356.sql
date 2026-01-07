-- Create interview pipeline stages enum-like table for flexibility
CREATE TABLE public.interview_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  is_ai_automated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default stages
INSERT INTO public.interview_stages (name, stage_order, is_ai_automated) VALUES
  ('Resume Screening', 1, true),
  ('AI Phone Interview', 2, true),
  ('Technical Assessment', 3, true),
  ('HR Round', 4, true),
  ('Final Review', 5, true),
  ('Offer Stage', 6, true);

-- Create interview candidates table (links candidates to jobs with AI scoring)
CREATE TABLE public.interview_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_stage_id UUID REFERENCES public.interview_stages(id),
  ai_score DECIMAL(5,2),
  ai_analysis JSONB,
  resume_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hired', 'rejected', 'withdrawn')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

-- Create interview events table (tracks each stage completion)
CREATE TABLE public.interview_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_candidate_id UUID NOT NULL REFERENCES public.interview_candidates(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.interview_stages(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'passed', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  ai_feedback JSONB,
  ai_score DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create interview invitations table
CREATE TABLE public.interview_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_event_id UUID NOT NULL REFERENCES public.interview_events(id) ON DELETE CASCADE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed', 'opened')),
  meeting_link TEXT,
  invitation_token TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create offer letters table
CREATE TABLE public.offer_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_candidate_id UUID NOT NULL REFERENCES public.interview_candidates(id) ON DELETE CASCADE,
  salary_offered DECIMAL(12,2),
  currency TEXT DEFAULT 'INR',
  position_title TEXT NOT NULL,
  start_date DATE,
  offer_content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  generated_by_ai BOOLEAN DEFAULT true,
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_stages (public read)
CREATE POLICY "Anyone can view interview stages" ON public.interview_stages FOR SELECT USING (true);

-- RLS Policies for interview_candidates
CREATE POLICY "Employers can view their job candidates" ON public.interview_candidates 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = interview_candidates.job_id AND jobs.employer_id = auth.uid())
);

CREATE POLICY "Employers can insert candidates for their jobs" ON public.interview_candidates 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_id AND jobs.employer_id = auth.uid())
);

CREATE POLICY "Employers can update their job candidates" ON public.interview_candidates 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = interview_candidates.job_id AND jobs.employer_id = auth.uid())
);

CREATE POLICY "Candidates can view their own interviews" ON public.interview_candidates 
FOR SELECT USING (candidate_id = auth.uid());

-- RLS Policies for interview_events
CREATE POLICY "Employers can manage interview events" ON public.interview_events 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.interview_candidates ic 
    JOIN public.jobs j ON j.id = ic.job_id 
    WHERE ic.id = interview_events.interview_candidate_id AND j.employer_id = auth.uid()
  )
);

CREATE POLICY "Candidates can view their interview events" ON public.interview_events 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.interview_candidates ic 
    WHERE ic.id = interview_events.interview_candidate_id AND ic.candidate_id = auth.uid()
  )
);

-- RLS Policies for interview_invitations
CREATE POLICY "Employers can manage invitations" ON public.interview_invitations 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.interview_events ie
    JOIN public.interview_candidates ic ON ic.id = ie.interview_candidate_id
    JOIN public.jobs j ON j.id = ic.job_id 
    WHERE ie.id = interview_invitations.interview_event_id AND j.employer_id = auth.uid()
  )
);

-- RLS Policies for offer_letters
CREATE POLICY "Employers can manage offer letters" ON public.offer_letters 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.interview_candidates ic
    JOIN public.jobs j ON j.id = ic.job_id 
    WHERE ic.id = offer_letters.interview_candidate_id AND j.employer_id = auth.uid()
  )
);

CREATE POLICY "Candidates can view their offer letters" ON public.offer_letters 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.interview_candidates ic 
    WHERE ic.id = offer_letters.interview_candidate_id AND ic.candidate_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_interview_candidate_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_interview_candidates_timestamp
BEFORE UPDATE ON public.interview_candidates
FOR EACH ROW EXECUTE FUNCTION public.update_interview_candidate_timestamp();

-- Enable realtime for interview tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_events;