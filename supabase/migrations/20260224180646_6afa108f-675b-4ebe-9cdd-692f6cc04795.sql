
CREATE TABLE public.mock_interview_pipeline_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_category TEXT NOT NULL,
  segment TEXT,
  category TEXT,
  class_level TEXT,
  core_subject TEXT,
  designation TEXT,
  ai_questions_enabled BOOLEAN NOT NULL DEFAULT false,
  stage_type TEXT NOT NULL DEFAULT 'all',
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_interview_pipeline_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read pipeline config"
  ON public.mock_interview_pipeline_config FOR SELECT
  TO authenticated USING (true);

-- Allow authenticated users to insert/update (admin will manage)
CREATE POLICY "Authenticated users can insert pipeline config"
  ON public.mock_interview_pipeline_config FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update pipeline config"
  ON public.mock_interview_pipeline_config FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete pipeline config"
  ON public.mock_interview_pipeline_config FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_mock_interview_pipeline_config_updated_at
  BEFORE UPDATE ON public.mock_interview_pipeline_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
