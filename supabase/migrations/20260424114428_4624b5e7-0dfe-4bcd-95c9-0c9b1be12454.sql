CREATE TABLE public.resume_analysis_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NULL,
  candidate_email TEXT NULL,
  job_id UUID NULL,
  job_title TEXT NULL,
  http_status INTEGER NULL,
  fallback_reason TEXT NOT NULL DEFAULT 'success',
  used_fallback BOOLEAN NOT NULL DEFAULT false,
  application_state TEXT NOT NULL DEFAULT 'ai_reviewed',
  overall_score NUMERIC NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_resume_analysis_audit_logs_created_at
  ON public.resume_analysis_audit_logs (created_at DESC);

CREATE INDEX idx_resume_analysis_audit_logs_state
  ON public.resume_analysis_audit_logs (application_state);

ALTER TABLE public.resume_analysis_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins and owners can read audit logs
CREATE POLICY "Admins and owners can view resume analysis audit logs"
ON public.resume_analysis_audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
);

-- No user-side inserts/updates/deletes; only the service role (edge functions) can write.
-- Service role bypasses RLS, so we intentionally do NOT add insert/update/delete policies.
