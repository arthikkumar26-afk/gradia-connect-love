import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

const plans = [
  { id: 'basic', name: 'Basic', duration: '1 Month', points: 100, features: ['Post up to 3 jobs', 'Basic candidate tracking'] },
  { id: 'standard', name: 'Standard', duration: '3 Months', points: 260, popular: true, features: ['Post up to 10 jobs', 'Candidate tracking', 'Email support'] },
  { id: 'premium', name: 'Premium', duration: '6 Months', points: 500, features: ['Unlimited jobs', 'Advanced tracking', 'Priority support'] },
];

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/employer/signup"); return; }
      const { data: terms } = await supabase.from("terms_acceptances").select("id").eq("employer_id", user.id).single();
      if (!terms) { toast({ title: 'Please accept terms first', variant: 'destructive' }); navigate("/employer/terms"); }
    };
    checkAuth();
  }, [navigate, toast]);

  const handleSelectPlan = async (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    setLoading(planId);
    setRetryError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/employer/signup"); return; }

      // Get wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!wallet) {
        throw new Error('Wallet not found. Please set up your wallet first.');
      }

      if ((wallet.points_balance || 0) < selectedPlan.points) {
        toast({
          title: 'Insufficient Points',
          description: `You need ${selectedPlan.points} pts but have ${wallet.points_balance || 0} pts. Load points from your Wallet.`,
          variant: 'destructive',
        });
        setLoading(null);
        return;
      }

      // Deduct points
      const newBalance = (wallet.points_balance || 0) - selectedPlan.points;
      await supabase.from('wallets').update({ points_balance: newBalance }).eq('id', wallet.id);

      // Record transaction
      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        transaction_type: 'debit',
        category: 'subscription',
        points: selectedPlan.points,
        description: `Employer ${selectedPlan.name} Plan - ${selectedPlan.duration}`,
      });

      toast({ title: 'Plan Activated!', description: `${selectedPlan.name} plan activated. ${selectedPlan.points} pts deducted.` });
      navigate(`/employer/subscription-success?session_id=wallet-${Date.now()}`);
    } catch (error: any) {
      console.error('Plan error:', error);
      setRetryError(error.message || 'Failed to activate plan. Please try again.');
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
          <p className="text-muted-foreground text-lg">Pay with wallet points • ₹5,000 = 1,000 points</p>
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
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold text-primary">{plan.points} pts</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">≈ ₹{(plan.points * 5).toLocaleString("en-IN")}</p>
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
                disabled={loading !== null} 
                className="w-full" 
                variant={plan.popular ? 'default' : 'outline'}
              >
                {loading === plan.id ? 'Processing...' : `Choose ${plan.name} – ${plan.points} pts`}
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
