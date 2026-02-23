
-- Mentorship enrollments (candidate enrolled with a freelancer mentor)
CREATE TABLE public.mentorship_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sessions_completed INT NOT NULL DEFAULT 0,
  next_session TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own enrollments" ON public.mentorship_enrollments
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Mentors can view own enrollments" ON public.mentorship_enrollments
  FOR SELECT USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can create enrollments" ON public.mentorship_enrollments
  FOR INSERT WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update own enrollments" ON public.mentorship_enrollments
  FOR UPDATE USING (auth.uid() = mentor_id);

CREATE POLICY "Candidates can insert enrollments" ON public.mentorship_enrollments
  FOR INSERT WITH CHECK (auth.uid() = candidate_id);

-- Homework assignments (mentor assigns to candidate)
CREATE TABLE public.mentorship_homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.mentorship_enrollments(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  score INT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own homework" ON public.mentorship_homework
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Mentors can view assigned homework" ON public.mentorship_homework
  FOR SELECT USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can create homework" ON public.mentorship_homework
  FOR INSERT WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update homework" ON public.mentorship_homework
  FOR UPDATE USING (auth.uid() = mentor_id);

CREATE POLICY "Candidates can update own homework status" ON public.mentorship_homework
  FOR UPDATE USING (auth.uid() = candidate_id);

-- Document submissions (candidate or mentor uploads)
CREATE TABLE public.mentorship_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.mentorship_enrollments(id) ON DELETE CASCADE,
  homework_id UUID REFERENCES public.mentorship_homework(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own documents" ON public.mentorship_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mentorship_enrollments e WHERE e.id = enrollment_id AND e.candidate_id = auth.uid())
  );

CREATE POLICY "Mentors can view enrollment documents" ON public.mentorship_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mentorship_enrollments e WHERE e.id = enrollment_id AND e.mentor_id = auth.uid())
  );

CREATE POLICY "Users can upload documents" ON public.mentorship_documents
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Mentors can update document reviews" ON public.mentorship_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.mentorship_enrollments e WHERE e.id = enrollment_id AND e.mentor_id = auth.uid())
  );

-- Mentorship courses (tracks course progress)
CREATE TABLE public.mentorship_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.mentorship_enrollments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_modules INT NOT NULL DEFAULT 1,
  completed_modules INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own courses" ON public.mentorship_courses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mentorship_enrollments e WHERE e.id = enrollment_id AND e.candidate_id = auth.uid())
  );

CREATE POLICY "Mentors can manage courses" ON public.mentorship_courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.mentorship_enrollments e WHERE e.id = enrollment_id AND e.mentor_id = auth.uid())
  );

-- Storage bucket for mentorship documents
INSERT INTO storage.buckets (id, name, public) VALUES ('mentorship-docs', 'mentorship-docs', true);

CREATE POLICY "Authenticated users can upload mentorship docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'mentorship-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view mentorship docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'mentorship-docs');

-- Timestamp trigger
CREATE TRIGGER update_mentorship_enrollments_updated_at
  BEFORE UPDATE ON public.mentorship_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_homework_updated_at
  BEFORE UPDATE ON public.mentorship_homework
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_courses_updated_at
  BEFORE UPDATE ON public.mentorship_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
