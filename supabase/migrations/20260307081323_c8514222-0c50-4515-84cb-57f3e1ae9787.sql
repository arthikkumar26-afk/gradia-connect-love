
CREATE TABLE public.campaign_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  sender_name TEXT DEFAULT 'Gradia EduTech',
  subject TEXT NOT NULL,
  html_body TEXT,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.campaign_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaign emails"
  ON public.campaign_emails FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign emails"
  ON public.campaign_emails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all campaign emails"
  ON public.campaign_emails FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'edutech'::app_role));
