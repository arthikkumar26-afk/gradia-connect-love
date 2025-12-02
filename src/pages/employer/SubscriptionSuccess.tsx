import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import gradiaLogo from '@/assets/gradia-logo.png';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const verifySubscription = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        toast({ title: 'Invalid session', variant: 'destructive' });
        navigate('/employer/plans');
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/employer/signup');
          return;
        }

        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('employer_id', user.id)
          .eq('stripe_subscription_id', sessionId)
          .single();

        if (error) throw error;

        setSubscription(data);
      } catch (error: any) {
        console.error('Verification error:', error);
        toast({ title: 'Error', description: 'Failed to verify subscription', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    verifySubscription();
  }, [searchParams, navigate, toast]);

  const handleContinue = () => {
    navigate('/employer/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-2xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground">Your subscription is now active</p>
        </div>

        {subscription && (
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Subscription Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{subscription.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Cycle:</span>
                <span className="font-medium capitalize">{subscription.billing_cycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {subscription.currency} {subscription.amount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started:</span>
                <span className="font-medium">
                  {new Date(subscription.started_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-green-600 capitalize">{subscription.status}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Button onClick={handleContinue} className="w-full">
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            A confirmation email has been sent to your registered email address
          </p>
        </div>
      </Card>
    </div>
  );
}
