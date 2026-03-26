
-- Pipeline email tracking table for strict stage-based email control
CREATE TABLE public.pipeline_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_candidate_id UUID NOT NULL REFERENCES public.interview_candidates(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  email_type TEXT NOT NULL, -- 'slot_booking', 'feedback_request', 'instruction', 'cv_results', 'interview_invitation', 'offer_letter'
  email_sent BOOLEAN NOT NULL DEFAULT false,
  stage_locked BOOLEAN NOT NULL DEFAULT false,
  trigger_source TEXT, -- 'process-interview-stage', 'book-slot', 'feedback-auto-advance', 'post-application-pipeline'
  resend_event_id TEXT, -- For Resend API idempotency
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(interview_candidate_id, stage_name, email_type)
);

-- Enable RLS
ALTER TABLE public.pipeline_email_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role full access on pipeline_email_log"
ON public.pipeline_email_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read their own logs
CREATE POLICY "Users can view pipeline email logs"
ON public.pipeline_email_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.interview_candidates ic
    WHERE ic.id = pipeline_email_log.interview_candidate_id
    AND ic.candidate_id = auth.uid()
  )
);

-- Index for fast lookups
CREATE INDEX idx_pipeline_email_log_candidate_stage 
ON public.pipeline_email_log(interview_candidate_id, stage_name, email_type);
