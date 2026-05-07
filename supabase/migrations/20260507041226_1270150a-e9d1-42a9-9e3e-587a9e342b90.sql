
CREATE TABLE public.skillory_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  voucher_code TEXT NOT NULL UNIQUE,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 50000,
  points_value INTEGER NOT NULL DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'purchased' CHECK (status IN ('purchased','redeemed')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skillory_vouchers_user ON public.skillory_vouchers(user_id);
CREATE INDEX idx_skillory_vouchers_status ON public.skillory_vouchers(status);

ALTER TABLE public.skillory_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vouchers" ON public.skillory_vouchers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own vouchers" ON public.skillory_vouchers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own vouchers" ON public.skillory_vouchers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins view all vouchers" ON public.skillory_vouchers
  FOR SELECT USING (public.is_admin_or_owner(auth.uid()));

CREATE TRIGGER trg_skillory_vouchers_updated
  BEFORE UPDATE ON public.skillory_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
