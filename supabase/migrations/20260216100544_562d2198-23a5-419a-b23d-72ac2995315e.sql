
-- Create candidate subscriptions table
CREATE TABLE public.candidate_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_plan CHECK (plan IN ('basic', 'pro', 'premium'))
);

-- Enable RLS
ALTER TABLE public.candidate_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
ON public.candidate_subscriptions FOR SELECT
USING (auth.uid() = candidate_id);

CREATE POLICY "Users can insert their own subscription"
ON public.candidate_subscriptions FOR INSERT
WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Users can update their own subscription"
ON public.candidate_subscriptions FOR UPDATE
USING (auth.uid() = candidate_id);

-- Trigger for updated_at
CREATE TRIGGER update_candidate_subscriptions_updated_at
BEFORE UPDATE ON public.candidate_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
