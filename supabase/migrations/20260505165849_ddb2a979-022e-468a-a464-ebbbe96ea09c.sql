CREATE TABLE IF NOT EXISTS public.hr_mail_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_mail_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR users can view mail templates"
ON public.hr_mail_templates FOR SELECT
USING (public.is_hr_user(auth.uid()) OR public.is_admin_or_owner(auth.uid()));

CREATE POLICY "HR users can insert their own mail templates"
ON public.hr_mail_templates FOR INSERT
WITH CHECK (created_by = auth.uid() AND (public.is_hr_user(auth.uid()) OR public.is_admin_or_owner(auth.uid())));

CREATE POLICY "Creators can update their mail templates"
ON public.hr_mail_templates FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their mail templates"
ON public.hr_mail_templates FOR DELETE
USING (created_by = auth.uid());

CREATE TRIGGER trg_hr_mail_templates_updated_at
BEFORE UPDATE ON public.hr_mail_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();