import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, CreditCard, Plus, Minus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    duration: 'Free',
    price: 0,
    features: ['3 job posts', '1 team seat', 'Basic applicant tracker', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    duration: '1 Month',
    price: 58000,
    popular: true,
    features: ['15 job posts', '5 team seats', 'Screening tests', 'Analytics dashboard', 'Priority support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    duration: '1 Month',
    price: 15000,
    features: ['50 job posts', '15 team seats', 'AI interview automation', 'Advanced analytics', 'Dedicated account manager', 'API access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    duration: '1 Month',
    price: 29000,
    features: ['Unlimited job posts', 'Unlimited seats', 'Custom integrations', 'SLA guarantee', 'White-label options', 'Dedicated support team'],
  },
];

// Add-on services. Each service costs wallet points (300+).
// 1 point = ₹5 (consistent with platform-wide wallet points pricing).
const POINT_TO_RUPEE = 5;

interface AddonService {
  id: string;
  name: string;
  description: string;
  points: number;
}

const addonServices: AddonService[] = [
  { id: 'vacancy_list', name: 'Vacancy List', description: 'Browse and manage all open vacancies in one place.', points: 320 },
  { id: 'smart_assessment', name: 'Smart Assessment', description: 'AI-powered candidate assessment & scoring engine.', points: 480 },
  { id: 'test_papers', name: 'Test Papers', description: 'Custom test paper creation and assignment toolkit.', points: 360 },
  { id: 'smm', name: 'SMM (Social Media Marketing)', description: 'Auto-post jobs to LinkedIn, Facebook, Instagram & more.', points: 540 },
  { id: 'my_vacancies', name: 'My Vacancies', description: 'Centralised vacancy templates & quick re-posting.', points: 310 },
  { id: 'candidate_data', name: 'Candidate Data', description: 'Talent pool with advanced multi-criteria filters.', points: 620 },
  { id: 'interview_pipeline', name: 'Interview Pipeline', description: 'End-to-end automated hiring pipeline & rounds.', points: 720 },
  { id: 'email_template', name: 'Email Template', description: 'Branded transactional & marketing email templates.', points: 340 },
  { id: 'feedback_matrix', name: 'Feedback Matrix', description: 'Structured observer feedback across all rounds.', points: 410 },
  { id: 'candidate_confirmation', name: 'Candidate Confirmation', description: 'Automated joining & onboarding confirmations.', points: 380 },
  { id: 'offer_letter', name: 'Offer Letter', description: 'AI-generated, brand-styled offer letter automation.', points: 560 },
  { id: 'approvals', name: 'Approvals', description: 'Multi-level internal approval workflow tools.', points: 330 },
  { id: 'candidates', name: 'Candidates', description: 'Unified directory of all registered candidates.', points: 470 },
  { id: 'campaigns', name: 'Campaigns', description: 'Email & invite campaigns with tracking analytics.', points: 520 },
  { id: 'suggested_candidates', name: 'Suggested Candidates', description: 'AI-recommended candidates matching your roles.', points: 690 },
];

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('growth');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});

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

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId)!, [selectedPlanId]);

  const { addonPoints, addonRupees, totalRupees, selectedAddonList } = useMemo(() => {
    const list = addonServices.filter(s => selectedAddons[s.id]);
    const points = list.reduce((sum, s) => sum + s.points, 0);
    const rupees = points * POINT_TO_RUPEE;
    return {
      selectedAddonList: list,
      addonPoints: points,
      addonRupees: rupees,
      totalRupees: (selectedPlan?.price || 0) + rupees,
    };
  }, [selectedAddons, selectedPlan]);

  const handlePay = async () => {
    if (!selectedPlan) return;

    // Free plan with no addons — activate without payment
    if (totalRupees === 0) {
      setLoading(selectedPlan.id);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/employer/signup"); return; }
        toast({ title: 'Starter Plan Activated', description: 'You can post up to 3 jobs free.' });
        navigate('/employer/dashboard');
      } finally {
        setLoading(null);
      }
      return;
    }

    if (!scriptLoaded) return;

    setLoading(selectedPlan.id);
    setRetryError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/employer/signup"); return; }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('Not authenticated');

      const planLabel = `${selectedPlan.name} Plan - ${selectedPlan.duration}` +
        (selectedAddonList.length ? ` + ${selectedAddonList.length} add-on${selectedAddonList.length > 1 ? 's' : ''} (${addonPoints} pts)` : '');

      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: totalRupees,
          currency: 'INR',
          plan_id: selectedPlan.id,
          plan_name: planLabel,
          employer_id: user.id,
          receipt: `emp_${selectedPlan.id}_${Date.now()}`,
        },
      });

      if (error || !data?.order_id) throw new Error(error?.message || 'Failed to create order');

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name, mobile')
        .eq('id', user.id)
        .maybeSingle();

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'Gradia',
        description: planLabel,
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: selectedPlan.id,
                plan_name: selectedPlan.name,
                amount: totalRupees,
                duration: selectedPlan.duration,
                employer_id: user.id,
                addon_services: selectedAddonList.map(s => ({ id: s.id, name: s.name, points: s.points })),
                addon_points: addonPoints,
              },
            });

            if (verifyError) throw verifyError;

            toast({
              title: 'Payment Successful!',
              description: `${selectedPlan.name} plan activated${addonPoints ? ` with ${addonPoints} add-on points` : ''}. Redirecting to dashboard…`,
            });
            navigate('/employer/dashboard');
          } catch (err: any) {
            console.error('Payment verification error:', err);
            toast({ title: 'Verification Failed', description: 'Payment received but verification failed. Contact support.', variant: 'destructive' });
          }
        },
        prefill: {
          name: profileRow?.full_name || "",
          email: user.email || "",
          contact: (profileRow as any)?.mobile || "",
        },
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
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">Pick a plan, add the services you need, and pay securely via Razorpay</p>
        </div>

        {retryError && <div className="mb-8 p-4 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive text-center max-w-md mx-auto">{retryError}</div>}

        {/* Plans selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <Card
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`p-6 relative flex flex-col cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary shadow-xl'
                    : 'hover:shadow-md hover:border-primary/40'
                } ${plan.popular ? 'md:scale-105' : ''}`}
              >
                {plan.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recommended</Badge>}
                {isSelected && (
                  <Badge variant="secondary" className="absolute -top-3 right-3 bg-primary text-primary-foreground">
                    <Check className="w-3 h-3 mr-1" /> Selected
                  </Badge>
                )}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-1">{plan.name} Plan</h3>
                  <p className="text-sm text-muted-foreground mb-4">Duration: {plan.duration}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-primary">{plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString("en-IN")}`}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-2 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        {/* Add-on services */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Add-on Services</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Tap <span className="font-semibold text-primary">+</span> to add a service. Each service is billed in wallet points
            (1 point = ₹{POINT_TO_RUPEE}). Selected services will be activated on your account after payment.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addonServices.map((s) => {
              const isOn = !!selectedAddons[s.id];
              return (
                <div
                  key={s.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors ${
                    isOn ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/30'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{s.name}</span>
                      <Badge variant="outline" className="text-[11px] py-0 h-5">
                        {s.points} pts
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.description}</p>
                    {isOn && (
                      <p className="text-[11px] text-primary font-medium mt-1">
                        Added — ₹{(s.points * POINT_TO_RUPEE).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant={isOn ? 'default' : 'outline'}
                    onClick={() => toggleAddon(s.id)}
                    aria-label={isOn ? `Remove ${s.name}` : `Add ${s.name}`}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    {isOn ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Order summary + Pay */}
        <Card className="p-6 mb-8 bg-muted/40">
          <h2 className="text-xl font-bold text-foreground mb-4">Order Summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {selectedPlan.name} Plan ({selectedPlan.duration})
              </span>
              <span className="font-semibold text-foreground">
                {selectedPlan.price === 0 ? 'Free' : `₹${selectedPlan.price.toLocaleString('en-IN')}`}
              </span>
            </div>

            {selectedAddonList.length > 0 && (
              <>
                <div className="border-t border-border my-2" />
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  Add-ons ({selectedAddonList.length})
                </div>
                {selectedAddonList.map((s) => (
                  <div key={s.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {s.name} <span className="text-xs">({s.points} pts)</span>
                    </span>
                    <span className="font-medium text-foreground">
                      ₹{(s.points * POINT_TO_RUPEE).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Total add-on points</span>
                  <span className="font-semibold text-primary">{addonPoints} pts</span>
                </div>
              </>
            )}

            <div className="border-t border-border my-3" />
            <div className="flex justify-between items-baseline">
              <span className="text-base font-bold text-foreground">Final Price</span>
              <span className="text-2xl font-bold text-primary">
                {totalRupees === 0 ? 'Free' : `₹${totalRupees.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          <Button
            onClick={handlePay}
            disabled={loading !== null || (totalRupees > 0 && !scriptLoaded)}
            className="w-full mt-5"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {loading
              ? 'Processing...'
              : totalRupees === 0
              ? 'Get Started Free'
              : `Pay ₹${totalRupees.toLocaleString('en-IN')} & Continue`}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Secure payment via Razorpay. After successful payment you'll be taken to your employer dashboard.
          </p>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/employer/terms')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        </div>
      </div>
    </div>
  );
}
