import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, CreditCard, Phone, Sparkles, Brain, BarChart3, Share2 } from 'lucide-react';
import { pricingPlans, featureComparison, mockSubscribe } from '@/utils/pricingApi';
import { useToast } from '@/hooks/use-toast';

const specialFeatures = [
  {
    icon: Brain,
    title: 'AI Interview Agent',
    description: 'Voice & text-based AI interviews that evaluate candidates in real-time with detailed scoring.',
  },
  {
    icon: Sparkles,
    title: 'AI Resume Screening',
    description: 'Automatically parse, score, and rank resumes using advanced AI models.',
  },
  {
    icon: BarChart3,
    title: 'Mock Interview Pipeline',
    description: 'Multi-stage mock interviews with AI feedback, recording, and performance tracking.',
  },
  {
    icon: Share2,
    title: 'SMM Marketing Suite',
    description: 'AI-generated flyers, one-click social sharing to Instagram, Facebook, Twitter & LinkedIn.',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string, cta: string) => {
    if (cta === 'free') {
      if (!isAuthenticated) {
        navigate('/employer/signup', { state: { from: '/employer/pricing', plan: 'starter' } });
        return;
      }
      toast({ title: 'Free plan activated!', description: 'You can now start posting jobs' });
      navigate('/employer/dashboard');
      return;
    }

    if (cta === 'contact') {
      navigate('/employer/demo');
      return;
    }

    if (!isAuthenticated) {
      toast({ title: 'Login required', description: 'Please login to subscribe to a paid plan' });
      navigate('/employer/login', { state: { from: '/employer/pricing' } });
      return;
    }

    setLoading(planId);
    try {
      const result = await mockSubscribe(planId, billingCycle, user?.id || '');
      if (result.success) {
        toast({ title: 'Subscription successful!', description: 'Your payment has been processed' });
        navigate('/employer/dashboard');
      }
    } catch {
      toast({ title: 'Error', description: 'Payment processing failed', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg mb-8">
            AI-powered recruitment plans tailored to every stage of your growth
          </p>

          {/* Billing toggle */}
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
              <span className="ml-2 text-xs font-semibold text-green-600 dark:text-green-400">
                (Save ~17%)
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 relative transition-all hover:shadow-lg flex flex-col ${
                plan.popular ? 'ring-2 ring-primary shadow-xl lg:scale-105 z-10' : ''
              } ${plan.badge ? 'ring-2 ring-accent' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              {plan.badge && !plan.popular && (
                <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {plan.badge}
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{plan.subtitle}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">
                    {plan.monthlyPrice === 0 ? 'Free' : `₹${(billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice).toLocaleString()}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className="text-muted-foreground text-sm">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
                {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ₹{Math.round(plan.annualPrice / 12).toLocaleString()}/mo billed annually
                  </p>
                )}
              </div>

              {/* Limits */}
              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-semibold text-foreground mb-1">Includes:</p>
                <p className="text-xs text-muted-foreground">{plan.limits.jobPosts}</p>
                <p className="text-xs text-muted-foreground">{plan.limits.seats}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={() => handleSelectPlan(plan.id, plan.cta)}
                disabled={loading !== null}
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
              >
                {loading === plan.id ? (
                  'Processing...'
                ) : plan.cta === 'free' ? (
                  'Get Started Free'
                ) : plan.cta === 'contact' ? (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Sales
                  </>
                ) : (
                  'Subscribe Now'
                )}
              </Button>

              {plan.id === 'growth' && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  14-day free trial included
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Special AI Features Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              <Sparkles className="w-6 h-6 inline-block mr-2 text-primary" />
              AI-Powered Special Features
            </h2>
            <p className="text-muted-foreground text-sm">
              Leverage cutting-edge AI to supercharge your recruitment process
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {specialFeatures.map((feat, i) => (
              <Card key={i} className="p-6 text-center hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                  <feat.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{feat.title}</h3>
                <p className="text-xs text-muted-foreground">{feat.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="bg-card rounded-lg border p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Compare All Features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-foreground">Feature</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-foreground">Starter</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-foreground">Growth</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-foreground">Professional</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((item, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-3 px-3 text-sm text-muted-foreground">{item.feature}</td>
                    {(['starter', 'growth', 'professional', 'enterprise'] as const).map((tier) => (
                      <td key={tier} className="py-3 px-3 text-center text-sm">
                        {typeof item[tier] === 'boolean' ? (
                          item[tier] ? (
                            <Check className="w-4 h-4 text-primary mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">{item[tier]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            All plans include 14-day money-back guarantee • Cancel anytime • No hidden fees
          </p>
          <p className="text-xs text-muted-foreground">
            Prices in INR. Payment processing via secure gateway. Terms apply.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate('/employer/demo')}>
              Request Demo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/contact')}>
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
