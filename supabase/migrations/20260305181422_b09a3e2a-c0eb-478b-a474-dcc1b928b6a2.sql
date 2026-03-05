
CREATE TABLE public.popup_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  link_label TEXT DEFAULT 'Learn More',
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_email_input BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.popup_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active popup ads"
  ON public.popup_ads FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins and owners can manage popup ads"
  ON public.popup_ads FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
