-- Create table to log every Razorpay event we observe (orders, verifications, webhooks)
CREATE TABLE public.razorpay_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,                  -- 'create-order' | 'verify-payment' | 'webhook' | 'verify-action-payment' | 'verify-candidate-payment'
  event_type TEXT,                       -- e.g. 'order.created', 'payment.captured', 'verify.success', 'verify.failure', 'signature.invalid'
  status TEXT NOT NULL DEFAULT 'info',   -- 'info' | 'success' | 'failure' | 'error'
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  webhook_event_id TEXT,                 -- Razorpay x-razorpay-event-id header (for webhook dedupe)
  amount_paise INTEGER,
  currency TEXT,
  user_id UUID,
  related_table TEXT,                    -- e.g. 'subscriptions','candidate_subscriptions','wallet_transactions'
  related_id UUID,
  http_status INTEGER,
  signature_valid BOOLEAN,
  error_message TEXT,
  request_headers JSONB DEFAULT '{}'::jsonb,
  request_body JSONB DEFAULT '{}'::jsonb,
  response_body JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_rzp_logs_created_at ON public.razorpay_webhook_logs (created_at DESC);
CREATE INDEX idx_rzp_logs_order_id ON public.razorpay_webhook_logs (razorpay_order_id);
CREATE INDEX idx_rzp_logs_payment_id ON public.razorpay_webhook_logs (razorpay_payment_id);
CREATE INDEX idx_rzp_logs_source_status ON public.razorpay_webhook_logs (source, status);
CREATE INDEX idx_rzp_logs_user_id ON public.razorpay_webhook_logs (user_id);

ALTER TABLE public.razorpay_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/owners can read these logs
CREATE POLICY "Admins and owners can view razorpay webhook logs"
ON public.razorpay_webhook_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
);

-- No client INSERT/UPDATE/DELETE policies → only the service role (used by edge functions) can write