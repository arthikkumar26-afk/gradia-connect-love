ALTER TABLE public.outsource_projects
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS pay_type text NOT NULL DEFAULT 'fixed';