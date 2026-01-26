import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  { id: 'basic', name: 'Basic', duration: '1 Month', price: 499, features: ['Post up to 3 jobs', 'Basic candidate tracking'] },
  { id: 'standard', name: 'Standard', duration: '3 Months', price: 1299, popular: true, features: ['Post up to 10 jobs', 'Candidate tracking', 'Email support'] },
  { id: 'premium', name: 'Premium', duration: '6 Months', price: 2499, features: ['Unlimited jobs', 'Advanced tracking', 'Priority support'] },
];

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/employer/signup"); return; }
      const { data: terms } = await supabase.from("terms_acceptances").select("id").eq("employer_id", user.id).single();
      if (!terms) { toast({ title: 'Please accept terms first', variant: 'destructive' }); navigate("/employer/terms"); }
    };
    checkAuth();

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [navigate, toast]);

  const handleSelectPlan = async (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    setLoading(planId);
    setRetryError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/employer/signup"); return; }

      // Get user profile for prefilling Razorpay
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, mobile, company_name')
        .eq('id', user.id)
        .single();

      // Create Razorpay order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: selectedPlan.price,
          currency: 'INR',
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          employer_id: user.id,
        },
      });

      if (orderError || !orderData) {
        throw new Error(orderError?.message || 'Failed to create order');
      }

      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error('Payment gateway not loaded. Please refresh and try again.');
      }

      // Configure Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Gradia',
        description: `${selectedPlan.name} Plan - ${selectedPlan.duration}`,
        order_id: orderData.order_id,
        prefill: {
          name: profile?.full_name || profile?.company_name || '',
          email: profile?.email || user.email || '',
          contact: profile?.mobile || '',
        },
        theme: {
          color: '#7c3aed',
        },
        handler: async function (response: any) {
          try {
            // Verify payment via edge function
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: selectedPlan.id,
                plan_name: selectedPlan.name,
                amount: selectedPlan.price,
                employer_id: user.id,
                billing_cycle: 'monthly',
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error('Payment verification failed');
            }

            toast({ title: 'Payment Successful!', description: `${selectedPlan.name} plan activated` });
            navigate(`/employer/subscription-success?session_id=${response.razorpay_payment_id}`);
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast({ title: 'Error', description: 'Payment verification failed. Please contact support.', variant: 'destructive' });
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(null);
            toast({ title: 'Payment Cancelled', description: 'You can try again anytime', variant: 'default' });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      setRetryError(error.message || 'Failed to initiate payment. Please try again.');
      toast({ title: 'Error', description: error.message || 'Failed to process payment', variant: 'destructive' });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 py-12">
      <div className="max-w-6xl mx-auto">
        <OnboardingProgress currentStep="payment" />
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">Select the perfect plan for your hiring needs</p>
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
                  <span className="text-3xl font-bold text-primary">₹{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/ {plan.duration.toLowerCase()}</span>
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
                disabled={loading !== null || !razorpayLoaded} 
                className="w-full" 
                variant={plan.popular ? 'default' : 'outline'}
              >
                {loading === plan.id ? 'Processing...' : !razorpayLoaded ? 'Loading...' : `Choose ${plan.name}`}
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