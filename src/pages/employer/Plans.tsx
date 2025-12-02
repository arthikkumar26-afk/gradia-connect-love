import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'Post up to 3 jobs',
      'Basic candidate tracker',
      'Email support',
      'No assessments',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    monthlyPrice: 7999,
    annualPrice: 79990,
    popular: true,
    features: [
      'Post up to 15 jobs',
      'Advanced tracker with screening tests',
      'Email + chat support',
      'One active panel interview flow',
      'Analytics dashboard (basic)',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 19999,
    annualPrice: 199990,
    features: [
      'Unlimited job posts',
      'Full tracker: Screening, Interview scheduling, Offer letter templates',
      'Advanced analytics, CSV export, API access',
      'Priority support + custom onboarding',
    ],
  },
];

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/employer/signup");
        return;
      }

      const { data: terms } = await supabase
        .from("terms_acceptances")
        .select("id")
        .eq("employer_id", user.id)
        .single();

      if (!terms) {
        toast({ title: 'Please accept terms first', variant: 'destructive' });
        navigate("/employer/terms");
      }
    };
    checkAuth();
  }, [navigate, toast]);

  const handleSelectPlan = async (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    setLoading(planId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Authentication required', variant: 'destructive' });
        navigate("/employer/signup");
        return;
      }

      const amount = billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice;

      if (planId === 'basic') {
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            employer_id: user.id,
            plan_id: planId,
            plan_name: selectedPlan.name,
            billing_cycle: billingCycle,
            amount: amount,
            currency: "INR",
            status: "active",
          });

        if (error) throw error;

        toast({ title: 'Free plan activated!', description: 'Proceeding to onboarding' });
        navigate("/employer/onboarding");
      } else {
        sessionStorage.setItem("selectedPlan", JSON.stringify({
          planId,
          planName: selectedPlan.name,
          billingCycle,
          amount,
        }));
        
        toast({ title: 'Redirecting to payment...', description: 'Stripe integration coming soon' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            employer_id: user.id,
            plan_id: planId,
            plan_name: selectedPlan.name,
            billing_cycle: billingCycle,
            amount: amount,
            currency: "INR",
            status: "active",
            payment_method: "card",
          });

        if (error) throw error;

        toast({ title: 'Payment successful!', description: 'Plan activated' });
        navigate("/employer/onboarding");
      }
    } catch (error: any) {
      console.error("Plan selection error:", error);
      toast({ title: 'Error', description: 'Failed to process plan selection', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 py-12">
      <div className="max-w-7xl mx-auto">
        <OnboardingProgress currentStep="payment" />
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg mb-8">Select the perfect plan for your hiring needs</p>
          
          <div className="inline-flex items-center gap-3 bg-muted/50 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full transition-all ${
                billingCycle === 'annual'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className="ml-2 text-xs">(Save 17%)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-8 relative ${
                plan.popular ? 'ring-2 ring-primary shadow-xl scale-105' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">
                    ₹{billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                  </span>
                  <span className="text-muted-foreground">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'annual' && plan.annualPrice > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ₹{(plan.annualPrice / 12).toFixed(2)}/month billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading !== null}
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
              >
                {loading === plan.id ? 'Processing...' : plan.id === 'basic' ? 'Start Free' : 'Select Plan'}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            All paid plans include a 14-day money-back guarantee • Cancel anytime
          </p>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}