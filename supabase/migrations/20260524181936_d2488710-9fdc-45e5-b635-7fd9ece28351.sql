
ALTER TABLE public.candidate_subscriptions DROP CONSTRAINT IF EXISTS valid_plan;

UPDATE public.candidate_subscriptions SET plan = 'free'    WHERE plan = 'basic';
UPDATE public.candidate_subscriptions SET plan = 'advance' WHERE plan = 'pro';
UPDATE public.candidate_subscriptions SET plan = 'elite'   WHERE plan = 'premium';

ALTER TABLE public.candidate_subscriptions
  ADD CONSTRAINT valid_plan
  CHECK (plan = ANY (ARRAY['free'::text, 'starter'::text, 'advance'::text, 'pro_accelerator'::text, 'elite'::text]));
