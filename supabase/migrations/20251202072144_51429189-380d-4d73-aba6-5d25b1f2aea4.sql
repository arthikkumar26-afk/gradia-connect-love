-- Create agreements table to record company agreement signatures
CREATE TABLE IF NOT EXISTS public.agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  company_name TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create terms_acceptances table to record T&C acceptances
CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table for payment plans
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agreements
CREATE POLICY "Employers can view their own agreements"
  ON public.agreements FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can insert their own agreements"
  ON public.agreements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employer_id);

-- RLS Policies for terms_acceptances
CREATE POLICY "Employers can view their own terms acceptances"
  ON public.terms_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can insert their own terms acceptances"
  ON public.terms_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employer_id);

-- RLS Policies for subscriptions
CREATE POLICY "Employers can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can insert their own subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employer_id);

-- Create indexes for better performance
CREATE INDEX idx_agreements_employer_id ON public.agreements(employer_id);
CREATE INDEX idx_terms_acceptances_employer_id ON public.terms_acceptances(employer_id);
CREATE INDEX idx_subscriptions_employer_id ON public.subscriptions(employer_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Create trigger for updating subscriptions updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();