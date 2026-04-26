-- Ensure idempotent plan activation: a single Razorpay payment can only create one subscription row.
-- stripe_subscription_id stores razorpay_payment_id for Razorpay-funded plans.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_unique
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;