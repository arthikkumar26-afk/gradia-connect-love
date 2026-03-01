
CREATE TABLE public.mentorship_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  topic TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  mentor_reply TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can insert their own requests" ON public.mentorship_requests FOR INSERT WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Candidates can view their own requests" ON public.mentorship_requests FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "Mentors can view requests to them" ON public.mentorship_requests FOR SELECT USING (auth.uid() = mentor_id);
CREATE POLICY "Mentors can update requests to them" ON public.mentorship_requests FOR UPDATE USING (auth.uid() = mentor_id);
CREATE POLICY "Candidates can delete their own requests" ON public.mentorship_requests FOR DELETE USING (auth.uid() = candidate_id);
