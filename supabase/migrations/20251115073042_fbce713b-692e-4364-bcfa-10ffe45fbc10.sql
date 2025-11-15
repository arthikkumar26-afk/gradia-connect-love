-- Extend app_role enum to include sponsor
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sponsor';

-- Create sponsors table for partner company information
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  company_description TEXT,
  website TEXT,
  logo_url TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze', -- bronze, silver, gold, platinum
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, inactive
  joined_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  contract_end_date TIMESTAMP WITH TIME ZONE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create sponsorships table for individual sponsorship records
CREATE TABLE public.sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  type TEXT NOT NULL, -- event, annual, project, custom
  benefits TEXT[], -- array of benefits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sponsor analytics table
CREATE TABLE public.sponsor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  logo_impressions INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  profile_visits INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sponsor_id, date)
);

-- Create branding resources table
CREATE TABLE public.branding_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- logo, guideline, template, deck, etc.
  file_size INTEGER, -- in bytes
  category TEXT, -- branding, marketing, event, support
  is_public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sponsors table
CREATE POLICY "Sponsors can view their own profile"
  ON public.sponsors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sponsors can update their own profile"
  ON public.sponsors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Sponsors can insert their own profile"
  ON public.sponsors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view active sponsors"
  ON public.sponsors FOR SELECT
  USING (status = 'active');

-- RLS Policies for sponsorships table
CREATE POLICY "Sponsors can view their own sponsorships"
  ON public.sponsorships FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sponsors
    WHERE sponsors.id = sponsorships.sponsor_id
    AND sponsors.user_id = auth.uid()
  ));

CREATE POLICY "Sponsors can manage their own sponsorships"
  ON public.sponsorships FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.sponsors
    WHERE sponsors.id = sponsorships.sponsor_id
    AND sponsors.user_id = auth.uid()
  ));

-- RLS Policies for sponsor analytics
CREATE POLICY "Sponsors can view their own analytics"
  ON public.sponsor_analytics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sponsors
    WHERE sponsors.id = sponsor_analytics.sponsor_id
    AND sponsors.user_id = auth.uid()
  ));

-- RLS Policies for branding resources
CREATE POLICY "Sponsors can view their own resources"
  ON public.branding_resources FOR SELECT
  USING (
    sponsor_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.sponsors
      WHERE sponsors.id = branding_resources.sponsor_id
      AND sponsors.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view public resources"
  ON public.branding_resources FOR SELECT
  USING (is_public = true);

CREATE POLICY "Sponsors can manage their resources"
  ON public.branding_resources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.sponsors
    WHERE sponsors.id = branding_resources.sponsor_id
    AND sponsors.user_id = auth.uid()
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_sponsors_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sponsorships_updated_at
  BEFORE UPDATE ON public.sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_branding_resources_updated_at
  BEFORE UPDATE ON public.branding_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();