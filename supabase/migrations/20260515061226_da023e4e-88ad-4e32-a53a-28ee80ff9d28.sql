ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_resumes;
ALTER TABLE public.candidate_resumes REPLICA IDENTITY FULL;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;