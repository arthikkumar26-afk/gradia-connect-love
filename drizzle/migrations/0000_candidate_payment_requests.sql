CREATE TABLE public.candidate_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid,
  job_title text,
  amount_paise integer NOT NULL CHECK (amount_paise >= 100),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','paid','failed','expired','cancelled')),
  razorpay_link_id text UNIQUE,
  payment_url text,
  razorpay_payment_id text,
  notified_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.candidate_payment_requests TO authenticated;
GRANT ALL ON public.candidate_payment_requests TO service_role;
ALTER TABLE public.candidate_payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employers view own payment requests" ON public.candidate_payment_requests
  FOR SELECT TO authenticated USING (employer_id = auth.uid() OR candidate_id = auth.uid());
CREATE INDEX ON public.candidate_payment_requests (employer_id, candidate_id);