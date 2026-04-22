-- Pricing config table
CREATE TABLE public.pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  amount_inr NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pricing"
  ON public.pricing_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage pricing"
  ON public.pricing_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pricing_config_updated_at
  BEFORE UPDATE ON public.pricing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pricing_config (action_key, label, amount_inr, description) VALUES
  ('mentor_contact_unlock', 'Mentor Contact Unlock', 1500, 'Unlock 1-on-1 mentor private contact details'),
  ('cv_unlock', 'CV / Resume Unlock', 250, 'Employer unlocks one candidate CV'),
  ('interview_unlock', 'Interview Unlock', 500, 'Employer unlocks interviews for one candidate'),
  ('extra_mock_test', 'Extra Mock Test', 99, 'Pay-per-use mock test beyond plan limit');

-- Payment transactions table (universal ₹ ledger)
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  amount_inr NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  related_user_id UUID,
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_tx_user ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX idx_payment_tx_order ON public.payment_transactions(razorpay_order_id);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all payments"
  ON public.payment_transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role inserts payments"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role updates payments"
  ON public.payment_transactions FOR UPDATE
  USING (true);

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();