import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Rocket, Building2, Phone, Sparkles, Brain, BarChart3, Share2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CouponInput } from "@/components/shared/CouponInput";

// Points-based pricing (₹5 = 1 point)
const plans = [
  {
    id: "starter",
    name: "Starter",
    subtitle: "For small teams getting started",
    points: 0,
    icon: Zap,
    features: [
      "Up to 3 active job posts",
      "Basic candidate tracker",
      "Email notifications",
      "Standard job templates",
      "Email support (48h response)",
      "1 user seat",
    ],
    cta: "free" as const,
  },
  {
    id: "growth",
    name: "Growth",
    subtitle: "Scale your hiring pipeline",
    points: 1000,
    icon: Star,
    popular: true,
    features: [
      "Up to 25 active job posts",
      "AI Resume Screening & Scoring",
      "AI-Powered Interview Scheduling",
      "Screening test management",
      "Mock Interview Pipeline (Basic)",
      "Social Media Job Posting",
      "Basic hiring analytics",
      "Email + chat support (24h)",
      "CSV / Excel exports",
      "5 user seats",
    ],
    cta: "subscribe" as const,
  },
  {
    id: "professional",
    name: "Professional",
    subtitle: "Full AI-powered recruitment",
    points: 3000,
    icon: Rocket,
    badge: "Best Value",
    features: [
      "Up to 100 active job posts",
      "AI Interview Agent (Voice + Text)",
      "AI Candidate Evaluation & Ranking",
      "Full Mock Interview Pipeline",
      "Advanced SMM Marketing Suite",
      "Offer letter automation",
      "Advanced analytics & reports",
      "Background verification tools",
      "Custom email templates",
      "Priority support (4h response)",
      "API access",
      "20 user seats",
    ],
    cta: "subscribe" as const,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    subtitle: "Custom solutions at scale",
    points: 5800,
    icon: Building2,
    features: [
      "Unlimited job posts & seats",
      "All Professional features",
      "AI-Powered Viva Voce Assessment",
      "Live Interview Monitoring",
      "Multi-stage pipeline automation",
      "HR Negotiation management",
      "White-label email branding",
      "Dedicated account manager",
      "Custom onboarding & training",
      "SLA guarantee (99.9% uptime)",
      "Custom integrations & API",
      "Advanced ROI & conversion reports",
    ],
    cta: "contact" as const,
  },
];

const specialFeatures = [
  { icon: Brain, title: "AI Interview Agent", desc: "Voice & text-based AI interviews with real-time evaluation" },
  { icon: Sparkles, title: "AI Resume Screening", desc: "Auto-parse, score, and rank resumes using advanced AI" },
  { icon: BarChart3, title: "Mock Interview Pipeline", desc: "Multi-stage mock interviews with AI feedback & recording" },
  { icon: Share2, title: "SMM Marketing Suite", desc: "AI flyers, one-click social sharing across platforms" },
];

export const UpgradePlanContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount: number; finalAmount: number; couponId: string; couponCode: string } | null>(null);
  const [selectedPlanForCoupon, setSelectedPlanForCoupon] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_id, plan_name, status")
        .eq("employer_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setCurrentPlan(data.plan_id);
    };
    fetchCurrentPlan();
  }, [user?.id]);

  const handleUpgrade = async (planId: string, cta: string) => {
    if (cta === "free") {
      toast({ title: "Free plan activated!", description: "You can now start posting jobs" });
      setCurrentPlan(planId);
      return;
    }

    if (cta === "contact") {
      navigate("/employer/demo");
      return;
    }

    const selectedPlan = plans.find((p) => p.id === planId);
    if (!selectedPlan || !user?.id) return;

    const pointsCost = appliedCoupon && selectedPlanForCoupon === planId ? appliedCoupon.finalAmount : selectedPlan.points;

    setLoading(planId);
    try {
      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet) {
        throw new Error("Wallet not found. Please set up your wallet first.");
      }

      if ((wallet.points_balance || 0) < pointsCost) {
        toast({
          title: "Insufficient Points",
          description: `You need ${pointsCost} pts but have ${wallet.points_balance || 0} pts. Load points from your Wallet.`,
          variant: "destructive",
        });
        return;
      }

      // Deduct points
      const newBalance = (wallet.points_balance || 0) - pointsCost;
      await supabase.from("wallets").update({ points_balance: newBalance }).eq("id", wallet.id);

      // Record transaction
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "subscription",
        points: pointsCost,
        description: `Employer ${selectedPlan.name} Plan Subscription`,
      });

      // Record coupon usage if applied
      if (appliedCoupon && selectedPlanForCoupon === planId) {
        await supabase.from("coupon_usages").insert({
          coupon_id: appliedCoupon.couponId,
          user_id: user.id,
          user_role: "employer",
          plan_name: selectedPlan.name,
          discount_applied: appliedCoupon.discount,
          original_amount: selectedPlan.points,
          final_amount: appliedCoupon.finalAmount,
        });
        await supabase.rpc("increment_coupon_usage" as any, { coupon_id_input: appliedCoupon.couponId });
        setAppliedCoupon(null);
        setSelectedPlanForCoupon(null);
      }

      toast({ title: "Plan Activated!", description: `${selectedPlan.name} plan activated. ${pointsCost} pts deducted.` });
      setCurrentPlan(planId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to process", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const planOrder = ["starter", "growth", "professional", "enterprise"];
  const currentIndex = currentPlan ? planOrder.indexOf(currentPlan) : -1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
          <Crown className="h-5 w-5" />
          <span className="font-semibold">Manage Your Plan</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {currentPlan ? "Upgrade or Change Your Plan" : "Choose a Plan"}
        </h2>
        <p className="text-muted-foreground mb-6">
          {currentPlan
            ? `You're currently on the ${plans.find((p) => p.id === currentPlan)?.name || "Starter"} plan`
            : "Select a plan • Pay with wallet points"}
        </p>
        <Badge variant="secondary" className="text-xs">₹5,000 = 1,000 Points</Badge>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const planIndex = planOrder.indexOf(plan.id);
          const isUpgrade = planIndex > currentIndex;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col ${
                plan.popular ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border"
              } ${'badge' in plan && plan.badge ? "ring-2 ring-accent/50" : ""} ${isCurrent ? "bg-primary/5 border-primary" : ""}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}
              {'badge' in plan && plan.badge && !plan.popular && (
                <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                  {plan.badge}
                </Badge>
              )}
              {isCurrent && (
                <div className="absolute top-0 left-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-br-lg">
                  CURRENT
                </div>
              )}

              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-foreground">
                    {plan.points === 0 ? "Free" : `${plan.points.toLocaleString()} pts`}
                  </span>
                  {plan.points > 0 && (
                    <span className="text-muted-foreground text-xs">/month</span>
                  )}
                </div>
                {plan.points > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">≈ ₹{(plan.points * 5).toLocaleString("en-IN")}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-4 flex-1 flex flex-col">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isCurrent || loading === plan.id}
                  onClick={() => handleUpgrade(plan.id, plan.cta)}
                >
                  {loading === plan.id
                    ? "Processing..."
                    : isCurrent
                    ? "Current Plan"
                    : plan.cta === "contact"
                    ? <>
                        <Phone className="w-4 h-4 mr-1" />
                        Contact Sales
                      </>
                    : plan.cta === "free"
                    ? "Get Started Free"
                    : isUpgrade
                    ? `Upgrade – ${plan.points} pts`
                    : `Switch – ${plan.points} pts`}
                </Button>

                {/* Coupon Input for paid plans */}
                {plan.cta === "subscribe" && !isCurrent && (
                  <CouponInput
                    originalAmount={plan.points}
                    userRole="employer"
                    onCouponApplied={(discount, finalAmount, couponId, couponCode) => {
                      setAppliedCoupon({ discount, finalAmount, couponId, couponCode });
                      setSelectedPlanForCoupon(plan.id);
                    }}
                    onCouponRemoved={() => {
                      setAppliedCoupon(null);
                      setSelectedPlanForCoupon(null);
                    }}
                  />
                )}
                {appliedCoupon && selectedPlanForCoupon === plan.id && (
                  <p className="text-xs text-center text-muted-foreground">
                    Pay {appliedCoupon.finalAmount.toLocaleString()} pts instead of {plan.points.toLocaleString()} pts
                  </p>
                )}

                {plan.id === "growth" && !isCurrent && (
                  <p className="text-xs text-center text-muted-foreground">14-day free trial included</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Special AI Features */}
      <div>
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-foreground inline-flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Powered Special Features
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Available in Growth, Professional & Enterprise plans</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {specialFeatures.map((feat, i) => (
            <Card key={i} className="p-4 text-center hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full mb-3">
                <feat.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">{feat.title}</h4>
              <p className="text-xs text-muted-foreground">{feat.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
