import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, CreditCard, Phone } from 'lucide-react';
import { pricingPlans, featureComparison, mockSubscribe } from '@/utils/pricingApi';
import { useToast } from '@/hooks/use-toast';

export default function Pricing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string, cta: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Please login to subscribe to a plan',
      });
      navigate('/employer/login', { state: { from: '/employer/pricing' } });
      return;
    }

    if (cta === 'free') {
      toast({
        title: 'Free plan activated!',
        description: 'You can now start posting jobs',
      });
      navigate('/employer/dashboard');
      return;
    }

    if (cta === 'contact') {
      navigate('/employer/demo');
      return;
    }

    setLoading(planId);
    try {
      const result = await mockSubscribe(planId, billingCycle, user?.id || '');
      if (result.success) {
        toast({
          title: 'Subscription successful!',
          description: 'Your payment has been processed',
        });
        navigate('/employer/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Payment processing failed',
        variant: 'destructive',
      });
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
            Select the perfect plan for your hiring needs
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
                (2 months free)
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-8 relative transition-all hover:shadow-lg ${
                plan.popular ? 'ring-2 ring-primary shadow-xl md:scale-105' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              {plan.id === 'scale' && (
                <Badge variant="outline" className="absolute -top-3 right-4">
                  Best for enterprises
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.subtitle}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">
                    ₹{billingCycle === 'monthly' ? plan.monthlyPrice.toLocaleString() : plan.annualPrice.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ₹{(plan.annualPrice / 12).toFixed(0)}/month billed annually
                  </p>
                )}
              </div>

              {/* Limits */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-semibold text-foreground mb-2">Plan limits:</p>
                <p className="text-sm text-muted-foreground">{plan.limits.jobPosts}</p>
                <p className="text-sm text-muted-foreground">{plan.limits.seats}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
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
                  'Get Started'
                ) : plan.cta === 'contact' ? (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Sales
                  </>
                ) : (
                  'Subscribe'
                )}
              </Button>

              {plan.id === 'growth' && (
                <p className="text-xs text-center text-muted-foreground mt-3">
                  14-day free trial available
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Feature comparison table */}
        <div className="bg-card rounded-lg border p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Compare Features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-foreground">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-foreground">
                    Basic
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-foreground">
                    Growth
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-foreground">
                    Scale
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((item, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {item.feature}
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof item.basic === 'boolean' ? (
                        item.basic ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-muted-foreground">{item.basic}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof item.growth === 'boolean' ? (
                        item.growth ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-muted-foreground">{item.growth}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof item.scale === 'boolean' ? (
                        item.scale ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-muted-foreground">{item.scale}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
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
