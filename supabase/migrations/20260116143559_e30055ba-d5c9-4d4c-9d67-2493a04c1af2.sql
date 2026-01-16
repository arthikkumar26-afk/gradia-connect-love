-- Create solutions table for storing detailed solutions
CREATE TABLE public.interview_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  solution_text TEXT NOT NULL,
  step_by_step JSONB DEFAULT '[]'::jsonb,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_solutions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - only admins and owners can manage solutions
CREATE POLICY "Only admins and owners can manage solutions"
ON public.interview_solutions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_interview_solutions_updated_at
BEFORE UPDATE ON public.interview_solutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();