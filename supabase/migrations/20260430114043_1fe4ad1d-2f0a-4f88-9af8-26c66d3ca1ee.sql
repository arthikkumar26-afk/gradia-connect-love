-- Track per-feature unlocks for candidates (1 month duration)
CREATE TABLE public.candidate_feature_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  feature TEXT NOT NULL,
  amount_paid INTEGER NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfu_candidate_feature ON public.candidate_feature_unlocks(candidate_id, feature, expires_at);

ALTER TABLE public.candidate_feature_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates view own unlocks"
ON public.candidate_feature_unlocks FOR SELECT
USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates insert own unlocks"
ON public.candidate_feature_unlocks FOR INSERT
WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Admins view all unlocks"
ON public.candidate_feature_unlocks FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role));
