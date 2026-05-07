import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Rocket, Building2, Phone, Sparkles, Brain, BarChart3, Share2, Wallet, Plus, Minus, CreditCard, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CouponInput } from "@/components/shared/CouponInput";

// Points-based pricing (₹5 = 1 point)
const plans = [
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
    points: 2000,
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
    points: 4000,
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
    cta: "subscribe" as const,
  },
];

const specialFeatures = [
  { icon: Brain, title: "AI Interview Agent", desc: "Voice & text-based AI interviews with real-time evaluation" },
  { icon: Sparkles, title: "AI Resume Screening", desc: "Auto-parse, score, and rank resumes using advanced AI" },
  { icon: BarChart3, title: "Mock Interview Pipeline", desc: "Multi-stage mock interviews with AI feedback & recording" },
  { icon: Share2, title: "SMM Marketing Suite", desc: "AI flyers, one-click social sharing across platforms" },
];

// Add-on services priced in wallet points (1 pt = ₹5).
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

export const UpgradePlanContent = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount: number; finalAmount: number; couponId: string; couponCode: string } | null>(null);
  const [selectedPlanForCoupon, setSelectedPlanForCoupon] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});

  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) => ({ ...prev, [id]: !prev[id] }));

  const { addonPoints, addonRupees, selectedAddonList } = useMemo(() => {
    const list = addonServices.filter((s) => selectedAddons[s.id]);
    const points = list.reduce((sum, s) => sum + s.points, 0);
    return {
      selectedAddonList: list,
      addonPoints: points,
      addonRupees: points * POINT_TO_RUPEE,
    };
  }, [selectedAddons]);

  // Load Razorpay checkout script once.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if ((window as any).Razorpay) {
      setScriptLoaded(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => setScriptLoaded(true));
      setScriptLoaded(!!(window as any).Razorpay);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

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
    // ₹5 = 1 point (project-wide wallet pricing). Razorpay charges in INR.
    const planRupees = pointsCost * 5;
    const amountInRupees = planRupees + addonRupees;

    if (amountInRupees <= 0) {
      toast({ title: "Invalid plan amount", description: "This plan can't be activated via payment.", variant: "destructive" });
      return;
    }

    if (!scriptLoaded || !(window as any).Razorpay) {
      toast({ title: "Payment unavailable", description: "Razorpay is still loading. Please try again in a moment.", variant: "destructive" });
      return;
    }

    setLoading(planId);
    try {
      // Create Razorpay order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: amountInRupees,
          currency: "INR",
          plan_id: selectedPlan.id,
          plan_name: `${selectedPlan.name} Plan (Upgrade)`,
          employer_id: user.id,
          receipt: `upg_${selectedPlan.id}_${Date.now()}`,
          addon_points: addonPoints,
          addon_services: selectedAddonList.map((s) => ({ id: s.id, name: s.name, points: s.points })),
        },
      });

      if (orderError || !orderData?.order_id) {
        throw new Error(orderError?.message || "Failed to create payment order");
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Gradia",
        description: `${selectedPlan.name} Plan Subscription`,
        order_id: orderData.order_id,
        prefill: {
          name: profile?.full_name || "",
          email: user.email || "",
          contact: profile?.mobile || "",
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => setLoading(null),
        },
        handler: async (response: any) => {
          try {
            // Verify payment server-side BEFORE granting plan / deducting points.
            // The edge function is the sole authority that activates the subscription.
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: selectedPlan.id,
                plan_name: selectedPlan.name,
                amount: amountInRupees,
                duration: "monthly",
                employer_id: user.id,
              },
            });

            if (verifyError) throw verifyError;
            if (!verifyData?.success) {
              throw new Error(verifyData?.error || "Payment could not be verified");
            }

            // Re-read the active subscription from the DB so UI reflects the
            // backend source of truth (works on refresh too — the effect re-runs).
            const { data: activeSub } = await supabase
              .from("subscriptions")
              .select("plan_id, status")
              .eq("employer_id", user.id)
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!activeSub || activeSub.status !== "active") {
              throw new Error("Subscription not found after payment. Please refresh.");
            }

            // Optional: traceability ledger entry (Razorpay-paid; no points deducted).
            const { data: wallet } = await supabase
              .from("wallets")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle();
            if (wallet) {
              await supabase.from("wallet_transactions").insert({
                wallet_id: wallet.id,
                transaction_type: "debit",
                category: "subscription",
                points: 0,
                description: `Employer ${selectedPlan.name} Plan Subscription (Razorpay ₹${amountInRupees})`,
              });
            }

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

            toast({
              title: verifyData.idempotent ? "Plan already active" : "Payment Successful!",
              description: `${selectedPlan.name} plan activated.`,
            });
            setCurrentPlan(activeSub.plan_id);
          } catch (err: any) {
            console.error("Payment verification error:", err);
            toast({
              title: "Verification Failed",
              description: err?.message || "Payment received but verification failed. Please contact support.",
              variant: "destructive",
            });
          } finally {
            setLoading(null);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        console.error("Razorpay payment failed:", resp.error);
        toast({
          title: "Payment Failed",
          description: resp.error?.description || "Please try again.",
          variant: "destructive",
        });
        setLoading(null);
      });
      rzp.open();
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({ title: "Error", description: error.message || "Failed to start payment", variant: "destructive" });
      setLoading(null);
    }
  };

  // Buy ONLY the selected add-ons (no plan change). Triggers Razorpay,
  // verifies server-side, sends a branded PDF invoice via send-payment-receipt
  // (handled inside verify-razorpay-payment), then refreshes the dashboard.
  const handleBuyAddons = async () => {
    if (!user?.id) return;
    if (selectedAddonList.length === 0 || addonRupees <= 0) {
      toast({ title: "No add-ons selected", description: "Tap + on a service to add it.", variant: "destructive" });
      return;
    }
    if (!scriptLoaded || !(window as any).Razorpay) {
      toast({ title: "Payment unavailable", description: "Razorpay is still loading. Please try again in a moment.", variant: "destructive" });
      return;
    }

    const itemName = `Add-on Services × ${selectedAddonList.length} (${addonPoints} pts)`;
    const itemDescription = selectedAddonList.map((s) => `${s.name} (${s.points} pts)`).join(", ");

    setLoading("addons");
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: addonRupees,
          currency: "INR",
          plan_id: "addons",
          plan_name: itemName,
          // No employer_id → verify-razorpay-payment uses the "non-employer" flow:
          // just verifies signature and emails the invoice, no subscription row.
          receipt: `addons_${user.id.slice(0, 8)}_${Date.now()}`,
          addon_points: addonPoints,
          addon_services: selectedAddonList.map((s) => ({ id: s.id, name: s.name, points: s.points })),
        },
      });

      if (orderError || !orderData?.order_id) {
        throw new Error(orderError?.message || "Failed to create payment order");
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Gradia",
        description: itemName,
        order_id: orderData.order_id,
        prefill: {
          name: profile?.full_name || "",
          email: user.email || "",
          contact: profile?.mobile || "",
        },
        theme: { color: "#6366f1" },
        modal: { ondismiss: () => setLoading(null) },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: addonRupees,
                item_name: itemName,
                item_description: itemDescription,
                item_type: "subscription",
                user_role: "employer",
              },
            });

            if (verifyError) throw verifyError;
            if (!verifyData?.success) throw new Error(verifyData?.error || "Payment could not be verified");

            // Optional: ledger entry for traceability
            const { data: wallet } = await supabase
              .from("wallets")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle();
            if (wallet) {
              await supabase.from("wallet_transactions").insert({
                wallet_id: wallet.id,
                transaction_type: "debit",
                category: "subscription",
                points: 0,
                description: `Add-on services purchase: ${itemDescription} (Razorpay ₹${addonRupees})`,
              });
            }

            toast({
              title: "Payment Successful!",
              description: `${selectedAddonList.length} add-on${selectedAddonList.length > 1 ? "s" : ""} activated. Invoice sent to your email.`,
            });
            // Reset selection and route back to dashboard
            setSelectedAddons({});
            navigate("/employer/dashboard");
          } catch (err: any) {
            console.error("Add-on payment verification error:", err);
            toast({
              title: "Verification Failed",
              description: err?.message || "Payment received but verification failed. Please contact support.",
              variant: "destructive",
            });
          } finally {
            setLoading(null);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        console.error("Razorpay add-on payment failed:", resp.error);
        toast({
          title: "Payment Failed",
          description: resp.error?.description || "Please try again.",
          variant: "destructive",
        });
        setLoading(null);
      });
      rzp.open();
    } catch (error: any) {
      console.error("Add-on purchase error:", error);
      toast({ title: "Error", description: error.message || "Failed to start payment", variant: "destructive" });
      setLoading(null);
    }
  };
  const planOrder = ["growth", "professional", "enterprise"];
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
            : "Select a plan • Pay securely with Razorpay"}
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
                    : isUpgrade
                    ? `Upgrade – Pay ₹${(plan.points * 5 + addonRupees).toLocaleString("en-IN")}${addonRupees ? ` (+${addonPoints} pts add-ons)` : ''}`
                    : `Switch – Pay ₹${(plan.points * 5 + addonRupees).toLocaleString("en-IN")}${addonRupees ? ` (+${addonPoints} pts add-ons)` : ''}`}
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

      {/* Add-on Services */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Add-on Services</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Tap <span className="font-semibold text-primary">+</span> to add a service. Each service is billed in wallet points
          (1 point = ₹{POINT_TO_RUPEE}). Add-on charges are added to your selected plan price below.
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

        {selectedAddonList.length > 0 && (
          <div className="mt-5 border-t border-border pt-4 space-y-2 text-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              Selected add-ons ({selectedAddonList.length})
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
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold text-foreground">Add-on Total</span>
              <span className="font-bold text-primary">
                {addonPoints} pts · ₹{addonRupees.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Click <span className="font-semibold">Buy Add-ons</span> to purchase only these services, or <span className="font-semibold">Pay</span> on any paid plan above to bundle them with your plan.
            </p>

            {/* Buy add-ons standalone via Razorpay */}
            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-background border border-border rounded-md p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                A branded GST invoice will be emailed to <span className="font-semibold text-foreground">{user?.email || "your registered email"}</span> after payment.
              </div>
              <Button
                onClick={handleBuyAddons}
                disabled={loading === "addons" || !scriptLoaded || addonRupees <= 0}
                size="sm"
                className="shrink-0"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {loading === "addons"
                  ? "Processing…"
                  : `Buy Add-ons – Pay ₹${addonRupees.toLocaleString("en-IN")}`}
              </Button>
            </div>
          </div>
        )}
      </Card>

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
