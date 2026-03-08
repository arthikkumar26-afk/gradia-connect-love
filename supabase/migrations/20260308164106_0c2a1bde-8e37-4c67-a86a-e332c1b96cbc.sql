
CREATE TABLE public.job_melas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  expected_attendees INTEGER DEFAULT 0,
  spots_available INTEGER DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'upcoming',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_melas ENABLE ROW LEVEL SECURITY;

-- Everyone can read active job melas
CREATE POLICY "Anyone can view active job melas"
ON public.job_melas
FOR SELECT
USING (is_active = true);

-- Admins can manage job melas
CREATE POLICY "Admins can manage job melas"
ON public.job_melas
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
