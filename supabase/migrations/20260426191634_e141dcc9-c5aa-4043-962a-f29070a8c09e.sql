-- 1. Drop candidate-only unlock tables
DROP TABLE IF EXISTS public.external_job_unlocks CASCADE;
DROP TABLE IF EXISTS public.interview_unlocks CASCADE;
DROP TABLE IF EXISTS public.cv_unlocks CASCADE;
DROP TABLE IF EXISTS public.mentor_contact_unlocks CASCADE;

-- 2. Remove candidate-owned wallet data (employer wallets remain intact)
DELETE FROM public.wallet_transactions
WHERE wallet_id IN (
  SELECT w.id FROM public.wallets w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE p.role = 'candidate'
);

DELETE FROM public.wallets
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'candidate'
);

-- 3. Create candidate feature usage counter
CREATE TABLE public.candidate_feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  feature text NOT NULL,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, feature, period_start)
);

CREATE INDEX idx_candidate_feature_usage_lookup
  ON public.candidate_feature_usage (candidate_id, feature, period_start);

ALTER TABLE public.candidate_feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates view their own usage"
  ON public.candidate_feature_usage
  FOR SELECT
  USING (auth.uid() = candidate_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Candidates insert their own usage"
  ON public.candidate_feature_usage
  FOR INSERT
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Candidates update their own usage"
  ON public.candidate_feature_usage
  FOR UPDATE
  USING (auth.uid() = candidate_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins delete usage"
  ON public.candidate_feature_usage
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_candidate_feature_usage_updated_at
  BEFORE UPDATE ON public.candidate_feature_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();