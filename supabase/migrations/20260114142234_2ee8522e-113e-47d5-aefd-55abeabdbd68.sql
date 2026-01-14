-- Create table to store resume analysis data
CREATE TABLE public.resume_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER DEFAULT 0,
  career_level TEXT,
  experience_summary TEXT,
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  skill_highlights TEXT[] DEFAULT '{}',
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint so each user has one analysis record (latest)
CREATE UNIQUE INDEX resume_analyses_user_id_unique ON public.resume_analyses(user_id);

-- Enable RLS
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own resume analysis
CREATE POLICY "Users can view own resume analysis"
ON public.resume_analyses FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own resume analysis
CREATE POLICY "Users can insert own resume analysis"
ON public.resume_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own resume analysis
CREATE POLICY "Users can update own resume analysis"
ON public.resume_analyses FOR UPDATE
USING (auth.uid() = user_id);

-- Employers can view candidate resume analyses (for hiring)
CREATE POLICY "Employers can view candidate analyses"
ON public.resume_analyses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'employer'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_resume_analyses_updated_at
BEFORE UPDATE ON public.resume_analyses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();