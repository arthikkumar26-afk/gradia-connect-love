
-- Freelancer plan coupons (issued when candidate buys a freelance add-on)
CREATE TABLE IF NOT EXISTS public.freelancer_plan_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  freelancer_plan_id text NOT NULL,
  status text NOT NULL DEFAULT 'unused',
  razorpay_payment_id text,
  razorpay_order_id text,
  amount_paid integer,
  redeemed_by_user_id uuid,
  redeemed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.freelancer_plan_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates view own freelance coupons"
  ON public.freelancer_plan_coupons FOR SELECT TO authenticated
  USING (auth.uid() = candidate_id OR auth.uid() = redeemed_by_user_id);

CREATE POLICY "Admins view all freelance coupons"
  ON public.freelancer_plan_coupons FOR SELECT TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_freelance_coupons_candidate ON public.freelancer_plan_coupons(candidate_id);
CREATE INDEX IF NOT EXISTS idx_freelance_coupons_code ON public.freelancer_plan_coupons(code);

-- Freelancer subscriptions (mirrors candidate_subscriptions)
CREATE TABLE IF NOT EXISTS public.freelancer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid NOT NULL,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  source_coupon_id uuid REFERENCES public.freelancer_plan_coupons(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.freelancer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Freelancer views own subscription"
  ON public.freelancer_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = freelancer_id);

CREATE POLICY "Admins view all freelancer subs"
  ON public.freelancer_subscriptions FOR SELECT TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_freelancer_subs_freelancer ON public.freelancer_subscriptions(freelancer_id);
