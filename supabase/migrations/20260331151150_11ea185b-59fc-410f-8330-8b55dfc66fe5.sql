
CREATE TABLE public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  initial_password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins and owners can view credentials"
ON public.user_credentials
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
);

CREATE POLICY "Only admins and owners can insert credentials"
ON public.user_credentials
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
);
