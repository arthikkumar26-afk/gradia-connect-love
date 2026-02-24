
-- Create freelancer portfolios table
CREATE TABLE public.freelancer_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tagline TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  website TEXT,
  github TEXT,
  linkedin TEXT,
  twitter TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create freelancer portfolio projects table
CREATE TABLE public.freelancer_portfolio_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.freelancer_portfolios(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  project_url TEXT,
  image_url TEXT,
  start_date DATE,
  end_date DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.freelancer_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Portfolio RLS policies
CREATE POLICY "Users can manage their own portfolio"
ON public.freelancer_portfolios FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public portfolios are viewable by everyone"
ON public.freelancer_portfolios FOR SELECT
USING (is_public = true);

-- Portfolio projects RLS policies
CREATE POLICY "Users can manage their own portfolio projects"
ON public.freelancer_portfolio_projects FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.freelancer_portfolios
  WHERE id = freelancer_portfolio_projects.portfolio_id
  AND user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.freelancer_portfolios
  WHERE id = freelancer_portfolio_projects.portfolio_id
  AND user_id = auth.uid()
));

CREATE POLICY "Public portfolio projects are viewable by everyone"
ON public.freelancer_portfolio_projects FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.freelancer_portfolios
  WHERE id = freelancer_portfolio_projects.portfolio_id
  AND is_public = true
));

-- Updated at triggers
CREATE TRIGGER update_freelancer_portfolios_updated_at
BEFORE UPDATE ON public.freelancer_portfolios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_freelancer_portfolio_projects_updated_at
BEFORE UPDATE ON public.freelancer_portfolio_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
