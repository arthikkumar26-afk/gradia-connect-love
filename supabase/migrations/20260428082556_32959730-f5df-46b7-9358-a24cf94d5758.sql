-- Reference table for Education sector salary bands
CREATE TABLE public.education_salary_bands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_code TEXT NOT NULL,           -- e.g. 'GROUP_I', 'GROUP_II', 'GROUP_III', 'GROUP_IV'
  group_name TEXT NOT NULL,           -- 'Group-I/BAND-1' etc.
  segment TEXT NOT NULL,              -- 'Admin & Academics', 'High School', 'Primary', 'Pre-Primary'
  role_title TEXT NOT NULL,
  qualifications TEXT,
  salary_min INTEGER NOT NULL,        -- INR per month
  salary_max INTEGER NOT NULL,        -- INR per month
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_education_salary_bands_group ON public.education_salary_bands(group_code);
CREATE INDEX idx_education_salary_bands_role ON public.education_salary_bands(role_title);

ALTER TABLE public.education_salary_bands ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "Education salary bands are viewable by everyone"
ON public.education_salary_bands
FOR SELECT
USING (true);

-- Only admins / owners can write
CREATE POLICY "Admins manage education salary bands"
ON public.education_salary_bands
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Auto-update updated_at
CREATE TRIGGER trg_education_salary_bands_updated_at
BEFORE UPDATE ON public.education_salary_bands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED DATA ============

-- GROUP I / BAND-1 — Admin & Academics
INSERT INTO public.education_salary_bands (group_code, group_name, segment, role_title, qualifications, salary_min, salary_max, display_order) VALUES
('GROUP_I', 'Group-I/BAND-1', 'Admin & Academics', 'Principal-State Board', 'PG + B.Ed', 50000, 80000, 1),
('GROUP_I', 'Group-I/BAND-1', 'Admin & Academics', 'Principal-CBSE Board', 'PG + B.Ed', 90000, 150000, 2),
('GROUP_I', 'Group-I/BAND-1', 'Admin & Academics', 'Cluster Principal',    'PG + B.Ed', 90000, 250000, 3),
('GROUP_I', 'Group-I/BAND-1', 'Admin & Academics', 'Academic Head',        'PG + B.Ed', 100000, 150000, 4),
('GROUP_I', 'Group-I/BAND-1', 'Admin & Academics', 'SME',                  'PG + B.Ed', 50000, 100000, 5),
('GROUP_I', 'Group-I/BAND-1', 'Admin & Academics', 'Resource Person',      'PG + B.Ed', 50000, 90000, 6);

-- GROUP II / BAND-II — High School Segment
INSERT INTO public.education_salary_bands (group_code, group_name, segment, role_title, qualifications, salary_min, salary_max, display_order) VALUES
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Vice-Principal/Dean',  'PG + B.Ed', 40000, 60000, 1),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Telugu Teacher',       'PG + B.Ed', 30000, 40000, 2),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Hindi Teacher',        'PG + B.Ed', 30000, 40000, 3),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'English Teacher',      'PG + B.Ed', 30000, 40000, 4),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Math Teacher',         'PG + B.Ed', 30000, 50000, 5),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Physics Teacher',      'PG + B.Ed', 30000, 50000, 6),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Chemistry Teacher',    'PG + B.Ed', 30000, 50000, 7),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Biology Teacher',      'PG + B.Ed', 30000, 40000, 8),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Social Teacher',       'PG + B.Ed', 30000, 40000, 9),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Computer Teacher',     'PG + B.Ed', 25000, 30000, 10),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'P.E.T',                'PG + B.Ed', 20000, 30000, 11),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Softskill Trainer',    'PG + B.Ed', 25000, 30000, 12),
('GROUP_II', 'Group-II/BAND-II', 'High School', 'Calligraphy Trainer',  'PG + B.Ed', 30000, 40000, 13);

-- GROUP III / BAND-III — Primary Segment
INSERT INTO public.education_salary_bands (group_code, group_name, segment, role_title, qualifications, salary_min, salary_max, display_order) VALUES
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Vice-Principal',     'PG + B.Ed', 20000, 35000, 1),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Mother Teacher',     NULL,        15000, 20000, 2),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Telugu Teacher',     'PG + B.Ed', 15000, 20000, 3),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Hindi Teacher',      'PG + B.Ed', 15000, 20000, 4),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'English Teacher',    'PG + B.Ed', 15000, 20000, 5),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Math Teacher',       'PG + B.Ed', 15000, 20000, 6),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Science Teacher',    'PG + B.Ed', 15000, 20000, 7),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Social Teacher',     'PG + B.Ed', 15000, 20000, 8),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Computer Teacher',   'PG + B.Ed', 15000, 20000, 9),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'P.E.T',              'PG + B.Ed', 15000, 20000, 10),
('GROUP_III', 'Group-III/BAND-III', 'Primary', 'Art & Craft Teacher', NULL,       10000, 20000, 11);

-- GROUP IV / BAND-IV — Pre-Primary Segment
INSERT INTO public.education_salary_bands (group_code, group_name, segment, role_title, qualifications, salary_min, salary_max, display_order) VALUES
('GROUP_IV', 'Group-IV/BAND-IV', 'Pre-Primary', 'Vice-Principal',  'PG + B.Ed', 20000, 30000, 1),
('GROUP_IV', 'Group-IV/BAND-IV', 'Pre-Primary', 'Mother Teacher',  NULL,        15000, 20000, 2),
('GROUP_IV', 'Group-IV/BAND-IV', 'Pre-Primary', 'Asso Teacher',    'PG + B.Ed', 15000, 20000, 3);