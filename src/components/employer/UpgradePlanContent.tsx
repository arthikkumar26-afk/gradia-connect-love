import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Rocket, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: "basic",
    name: "Basic",
    subtitle: "Starter",
    price: 499,
    duration: "1 Month",
    icon: Zap,
    features: [
      "Post up to 3 jobs",
      "Basic candidate tracking",
      "Email support",
      "1 seat (1 user)",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    subtitle: "Growth",
    price: 1299,
    duration: "3 Months",
    icon: Star,
    popular: true,
    features: [
      "Post up to 10 jobs",
      "Advanced candidate tracking",
      "Screening tests",
      "Interview scheduling",
      "5 seats",
      "Email + chat support",
      "CSV export",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    subtitle: "Scale",
    price: 2499,
    duration: "6 Months",
    icon: Rocket,
    features: [
      "Unlimited job posts",
      "Full pipeline automation",
      "Offer letter templates",
      "Priority support",
      "API access",
      "Unlimited seats",
      "Advanced analytics + exports",
      "Custom onboarding",
    ],
  },
];

export const UpgradePlanContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

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

  const handleUpgrade = async (planId: string) => {
    const selectedPlan = plans.find((p) => p.id === planId);
    if (!selectedPlan || !user?.id) return;

    setLoading(planId);
    try {
      toast({ title: "Initializing payment...", description: "Please wait" });

      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: selectedPlan.price,
          currency: "INR",
          plan_id: planId,
          plan_name: selectedPlan.name,
          employer_id: user.id,
        },
      });

      if (orderError || !orderData?.order_id) {
        throw new Error(orderData?.error || "Failed to create payment order");
      }

      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay"));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Gradia",
        description: `${selectedPlan.name} Plan - ${selectedPlan.duration}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: planId,
                plan_name: selectedPlan.name,
                amount: selectedPlan.price,
                employer_id: user.id,
                billing_cycle: "monthly",
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyData?.error || "Payment verification failed");
            }

            toast({ title: "Payment Successful!", description: `${selectedPlan.name} plan activated` });
            setCurrentPlan(planId);
          } catch (err: any) {
            toast({ title: "Payment Verification Failed", description: err.message, variant: "destructive" });
          }
        },
        prefill: { email: user.email || "" },
        theme: { color: "#10b981" },
        modal: {
          ondismiss: () => {
            setLoading(null);
            toast({ title: "Payment Cancelled", description: "You can try again anytime", variant: "destructive" });
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      return;
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to process payment", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const planOrder = ["basic", "standard", "premium"];
  const currentIndex = currentPlan ? planOrder.indexOf(currentPlan) : -1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
          <Crown className="h-5 w-5" />
          <span className="font-semibold">Manage Your Plan</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {currentPlan ? "Upgrade or Change Your Plan" : "Choose a Plan"}
        </h2>
        <p className="text-muted-foreground">
          {currentPlan
            ? `You're currently on the ${plans.find((p) => p.id === currentPlan)?.name || "Basic"} plan`
            : "Select a plan to get started"}
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const planIndex = planOrder.indexOf(plan.id);
          const isDowngrade = planIndex <= currentIndex && !isCurrent;
          const isUpgrade = planIndex > currentIndex;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                plan.popular ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border"
              } ${isCurrent ? "bg-primary/5 border-primary" : ""}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-0 left-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-br-lg">
                  CURRENT PLAN
                </div>
              )}

              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-foreground">₹{plan.price.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">/{plan.duration}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isCurrent || loading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {loading === plan.id
                    ? "Processing..."
                    : isCurrent
                    ? "Current Plan"
                    : isUpgrade
                    ? "Upgrade Now"
                    : "Switch Plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
