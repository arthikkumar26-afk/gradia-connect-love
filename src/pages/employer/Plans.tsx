import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  { id: 'basic', name: 'Basic', duration: '1 Month', price: 5, features: ['Post up to 3 jobs', 'Basic candidate tracking'] },
  { id: 'standard', name: 'Standard', duration: '3 Months', price: 4999, popular: true, features: ['Post up to 10 jobs', 'Candidate tracking', 'Email support'] },
  { id: 'premium', name: 'Premium', duration: '6 Months', price: 9999, features: ['Unlimited jobs', 'Advanced tracking', 'Priority support'] },
];

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/employer/signup"); return; }
      const { data: terms } = await supabase.from("terms_acceptances").select("id").eq("employer_id", user.id).single();
      if (!terms) { toast({ title: 'Please accept terms first', variant: 'destructive' }); navigate("/employer/terms"); }
    };
    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handleSelectPlan = async (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan || !scriptLoaded) return;

    setLoading(planId);
    setRetryError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/employer/signup"); return; }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('Not authenticated');

      // Create Razorpay order via edge function
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: selectedPlan.price,
          currency: 'INR',
          plan_id: selectedPlan.id,
          plan_name: `${selectedPlan.name} Plan - ${selectedPlan.duration}`,
          employer_id: user.id,
          receipt: `emp_${selectedPlan.id}_${Date.now()}`,
        },
      });

      if (error || !data?.order_id) throw new Error(error?.message || 'Failed to create order');

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'Gradia',
        description: `${selectedPlan.name} Plan - ${selectedPlan.duration}`,
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: selectedPlan.id,
                plan_name: selectedPlan.name,
                amount: selectedPlan.price,
                duration: selectedPlan.duration,
                employer_id: user.id,
              },
            });

            if (verifyError) throw verifyError;

            toast({ title: 'Payment Successful!', description: `${selectedPlan.name} plan activated.` });
            navigate(`/employer/subscription-success?session_id=${response.razorpay_payment_id}`);
          } catch (err: any) {
            console.error('Payment verification error:', err);
            toast({ title: 'Verification Failed', description: 'Payment received but verification failed. Contact support.', variant: 'destructive' });
          }
        },
        prefill: { email: user.email },
        theme: { color: '#6366f1' },
        modal: {
          ondismiss: () => setLoading(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        console.error('Payment failed:', resp.error);
        toast({ title: 'Payment Failed', description: resp.error?.description || 'Please try again', variant: 'destructive' });
        setLoading(null);
      });
      rzp.open();
    } catch (error: any) {
      console.error('Plan error:', error);
      setRetryError(error.message || 'Failed to initiate payment.');
      toast({ title: 'Error', description: error.message || 'Failed to process', variant: 'destructive' });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 py-12">
      <div className="max-w-6xl mx-auto">
        <OnboardingProgress currentStep="payment" />
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">Secure payment via Razorpay</p>
        </div>

        {retryError && <div className="mb-8 p-4 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive text-center max-w-md mx-auto">{retryError}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <Card key={plan.id} className={`p-6 relative flex flex-col ${plan.popular ? 'ring-2 ring-primary shadow-xl md:scale-105' : ''}`}>
              {plan.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recommended</Badge>}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-1">{plan.name} Plan</h3>
                <p className="text-sm text-muted-foreground mb-4">Duration: {plan.duration}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">₹{plan.price.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading !== null || !scriptLoaded}
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {loading === plan.id ? 'Processing...' : `Pay ₹${plan.price.toLocaleString("en-IN")}`}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/employer/terms')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        </div>
      </div>
    </div>
  );
}
