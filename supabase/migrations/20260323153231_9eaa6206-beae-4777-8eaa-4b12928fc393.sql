
CREATE TABLE public.feedback_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  stage_type TEXT NOT NULL DEFAULT 'demo',
  rating_scale INTEGER NOT NULL DEFAULT 5,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_template_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.feedback_form_templates(id) ON DELETE CASCADE,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'rating',
  field_options JSONB,
  is_required BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage own templates" ON public.feedback_form_templates
  FOR ALL TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

CREATE POLICY "Employers can manage own template fields" ON public.feedback_template_fields
  FOR ALL TO authenticated
  USING (template_id IN (SELECT id FROM public.feedback_form_templates WHERE employer_id = auth.uid()))
  WITH CHECK (template_id IN (SELECT id FROM public.feedback_form_templates WHERE employer_id = auth.uid()));
