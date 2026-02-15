
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Set existing profiles to active
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;
