CREATE TABLE public.subscription_activation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID,
  plan TEXT,
  source TEXT NOT NULL DEFAULT 'webhook',
  payment_id TEXT,
  order_id TEXT,
  amount_paise BIGINT,
  currency TEXT,
  activation_result TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  webhook_event_id TEXT,
  payload_summary JSONB DEFAULT '{}'::jsonb,
  subscription_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_act_logs_created_at ON public.subscription_activation_logs (created_at DESC);
CREATE INDEX idx_sub_act_logs_candidate ON public.subscription_activation_logs (candidate_id);
CREATE INDEX idx_sub_act_logs_payment ON public.subscription_activation_logs (payment_id);

ALTER TABLE public.subscription_activation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view activation logs"
ON public.subscription_activation_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));