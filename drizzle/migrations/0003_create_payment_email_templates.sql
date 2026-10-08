CREATE TABLE public.payment_email_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 name text NOT NULL,
 subject text NOT NULL,
 body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_email_templates TO authenticated;
GRANT ALL ON public.payment_email_templates TO service_role;
ALTER TABLE public.payment_email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage payment templates" ON public.payment_email_templates FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX payment_email_templates_owner_idx ON public.payment_email_templates(owner_id);