-- Create management team members table to store people who receive notifications
CREATE TABLE public.management_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'reviewer',
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  receives_slot_notifications BOOLEAN DEFAULT true,
  receives_demo_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create management reviews/feedback table for demo round
CREATE TABLE public.management_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.management_team(id),
  reviewer_email TEXT,
  reviewer_name TEXT,
  feedback_token TEXT UNIQUE,
  feedback_token_expires_at TIMESTAMP WITH TIME ZONE,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  teaching_skills_rating INTEGER CHECK (teaching_skills_rating >= 1 AND teaching_skills_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  subject_knowledge_rating INTEGER CHECK (subject_knowledge_rating >= 1 AND subject_knowledge_rating <= 5),
  recommendation TEXT CHECK (recommendation IN ('strongly_recommend', 'recommend', 'needs_improvement', 'not_recommend')),
  feedback_text TEXT,
  strengths TEXT[],
  areas_for_improvement TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'expired')),
  sent_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.management_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for management_team (admin only for write, public for reading active members)
CREATE POLICY "Admins can manage management_team" 
ON public.management_team 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow reading active management team" 
ON public.management_team 
FOR SELECT 
USING (is_active = true);

-- RLS policies for management_reviews
CREATE POLICY "Admins can manage reviews" 
ON public.management_reviews 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Candidates can view their own reviews" 
ON public.management_reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.mock_interview_sessions 
    WHERE id = management_reviews.session_id 
    AND candidate_id = auth.uid()
  )
);

CREATE POLICY "Public can submit feedback with valid token" 
ON public.management_reviews 
FOR UPDATE 
USING (
  feedback_token IS NOT NULL 
  AND status = 'pending' 
  AND feedback_token_expires_at > now()
);

-- Create triggers for updated_at
CREATE TRIGGER update_management_team_updated_at
  BEFORE UPDATE ON public.management_team
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_management_reviews_updated_at
  BEFORE UPDATE ON public.management_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add some indexes for performance
CREATE INDEX idx_management_reviews_session_id ON public.management_reviews(session_id);
CREATE INDEX idx_management_reviews_feedback_token ON public.management_reviews(feedback_token);
CREATE INDEX idx_management_reviews_status ON public.management_reviews(status);
CREATE INDEX idx_management_team_email ON public.management_team(email);