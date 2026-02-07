
-- Create table to store employer social media connections
CREATE TABLE public.social_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'facebook', 'twitter', 'linkedin', 'instagram'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id TEXT,
  platform_username TEXT,
  platform_display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employer_id, platform)
);

-- Enable RLS
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Employers can only manage their own connections
CREATE POLICY "Employers can view their own social connections"
  ON public.social_connections FOR SELECT
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can insert their own social connections"
  ON public.social_connections FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own social connections"
  ON public.social_connections FOR UPDATE
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own social connections"
  ON public.social_connections FOR DELETE
  USING (auth.uid() = employer_id);

-- Auto-update timestamp
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
