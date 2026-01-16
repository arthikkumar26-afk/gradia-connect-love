-- Create table for interview question papers
CREATE TABLE public.interview_question_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  stage_type TEXT NOT NULL CHECK (stage_type IN ('technical_assessment', 'demo_round', 'viva', 'all')),
  pdf_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for extracted questions
CREATE TABLE public.interview_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES public.interview_question_papers(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text' CHECK (question_type IN ('text', 'multiple_choice', 'true_false')),
  options JSONB,
  marks INTEGER DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for answer keys
CREATE TABLE public.interview_answer_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_case_sensitive BOOLEAN NOT NULL DEFAULT false,
  min_keyword_match_percent INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answer_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_question_papers
CREATE POLICY "Admins and owners can manage question papers"
ON public.interview_question_papers
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Anyone can view active question papers"
ON public.interview_question_papers
FOR SELECT
USING (is_active = true);

-- RLS Policies for interview_questions
CREATE POLICY "Admins and owners can manage questions"
ON public.interview_questions
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Anyone can view questions from active papers"
ON public.interview_questions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.interview_question_papers 
  WHERE id = interview_questions.paper_id AND is_active = true
));

-- RLS Policies for interview_answer_keys
CREATE POLICY "Only admins and owners can manage answer keys"
ON public.interview_answer_keys
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

-- Triggers for updated_at
CREATE TRIGGER update_interview_question_papers_updated_at
BEFORE UPDATE ON public.interview_question_papers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_answer_keys_updated_at
BEFORE UPDATE ON public.interview_answer_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();