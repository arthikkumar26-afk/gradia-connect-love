-- Create email templates table for customizable stage notifications
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'stage_transition', -- stage_transition, rejection, offer, etc.
  subject TEXT NOT NULL,
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  primary_color TEXT DEFAULT '#10b981',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employer_id, stage_name, template_type)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Employers can manage their own templates
CREATE POLICY "Employers can view their own templates"
  ON public.email_templates FOR SELECT
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can create their own templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own templates"
  ON public.email_templates FOR UPDATE
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own templates"
  ON public.email_templates FOR DELETE
  USING (auth.uid() = employer_id);

-- Add updated_at trigger
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();