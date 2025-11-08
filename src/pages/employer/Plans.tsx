import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { mockProcessPayment } from '@/utils/mockApi';
import { useToast } from '@/hooks/use-toast';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 99,
    annualPrice: 990,
    features: [
      'Up to 5 active job postings',
      'Basic candidate search',
      'Email support',
      'Application tracking',
      'Basic analytics',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    monthlyPrice: 199,
    annualPrice: 1990,
    popular: true,
    features: [
      'Up to 20 active job postings',
      'Advanced candidate search',
      'Priority email support',
      'Full application tracking',
      'Advanced analytics',
      'Team collaboration (5 users)',
      'Custom branding',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 399,
    annualPrice: 3990,
    features: [
      'Unlimited job postings',
      'AI-powered candidate matching',
      '24/7 phone & email support',
      'Complete application pipeline',
      'Enterprise analytics',
      'Unlimited team members',
      'Custom branding & domain',
      'API access',
      'Dedicated account manager',
    ],
  },
];

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: 'basic' | 'standard' | 'premium') => {
    setLoading(planId);
    
    try {
      const userId = sessionStorage.getItem('registrationUserId') || '';
      const result = await mockProcessPayment({ userId, plan: planId, billingCycle });
      
      if (result.success) {
        sessionStorage.setItem('selectedPlan', planId);
        sessionStorage.setItem('subscriptionId', result.subscriptionId || '');
        toast({ title: 'Payment successful!', description: 'Proceeding to onboarding' });
        navigate('/employer/onboarding');
      } else {
        toast({ title: 'Payment failed', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Payment processing failed', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 py-12">
      <div className="max-w-7xl mx-auto">
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
                    ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                  </span>
                  <span className="text-muted-foreground">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ${(plan.annualPrice / 12).toFixed(2)}/month billed annually
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
                onClick={() => handleSelectPlan(plan.id as 'basic' | 'standard' | 'premium')}
                disabled={loading !== null}
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
              >
                {loading === plan.id ? 'Processing...' : 'Select Plan'}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            All plans include a 14-day money-back guarantee • Cancel anytime
          </p>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
