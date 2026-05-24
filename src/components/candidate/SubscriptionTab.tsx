import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Crown, Check, Loader2, Sparkles, ArrowUpRight, Infinity as InfinityIcon, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCandidateSubscription } from "@/hooks/useCandidateSubscription";
import SkilloryVoucherCard from "@/components/candidate/SkilloryVoucherCard";
import {
  CANDIDATE_PLANS,
  FEATURE_LABELS,
  type CandidateFeature,
  type CandidatePlan,
} from "@/config/candidatePlans";

const FEATURE_ORDER: CandidateFeature[] = [
  "job_apply",
  "external_job_unlock",
  "mock_interview",
  "mentor_unlock",
  "ai_job_apply",
  "resume_download",
];

// Plan prices in INR (must mirror priceInr in candidatePlans.ts).
const PLAN_PRICES: Record<CandidatePlan, number> = {
  free: 0,
  starter: 999,
  advance: 2999,
  pro_accelerator: 7999,
  elite: 34999,
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function SubscriptionTab() {
  const navigate = useNavigate();
  const sub = useCandidateSubscription();
  const [purchasing, setPurchasing] = useState<CandidatePlan | null>(null);

  const startPurchase = async (planId: CandidatePlan) => {
    if (!sub.userId) {
      toast.error("Please sign in to purchase a plan");
      return;
    }
    if (planId === "free") {
      toast.info("Free Access is the starter tier — no payment needed.");
      return;
    }
    const amount = PLAN_PRICES[planId];
    setPurchasing(planId);

    try {
      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Failed to load payment gateway. Check your connection and retry.");
        return;
      }

      // 1) Create Razorpay order via existing edge function
      const { data: orderRes, error: orderErr } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount,
            currency: "INR",
            plan_id: planId,
            plan_name: `Candidate ${planId} (annual)`,
          },
        },
      );

      if (orderErr || !orderRes?.order_id) {
        console.error("Order creation failed", orderErr, orderRes);
        toast.error(orderRes?.error || "Could not start payment. Please retry.");
        return;
      }

      // 2) Get user info for prefill
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", sub.userId)
        .maybeSingle();

      // 3) Open Razorpay checkout
      const planDef = CANDIDATE_PLANS[planId];
      const rzp = new window.Razorpay({
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        order_id: orderRes.order_id,
        name: "Gradia",
        description: `${planDef.name} Plan – Annual Subscription`,
        prefill: {
          name: profile?.full_name || "",
          email: user?.email || "",
        },
        theme: { color: "#7c3aed" },
        handler: async (response: any) => {
          try {
            const { data: verifyRes, error: verifyErr } = await supabase.functions.invoke(
              "verify-candidate-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan: planId,
                  amount,
                  candidate_id: sub.userId,
                },
              },
            );
            if (verifyErr || !verifyRes?.success) {
              console.error("Verify failed", verifyErr, verifyRes);
              toast.error(verifyRes?.error || "Payment verification failed.");
              return;
            }
            toast.success(`${planDef.name} plan activated! 🎉`);
            await sub.refresh();
          } catch (e) {
            console.error("verify exception", e);
            toast.error("Activation failed after payment. Contact support.");
          } finally {
            setPurchasing(null);
          }
        },
        modal: {
          ondismiss: () => setPurchasing(null),
        },
      });

      rzp.on("payment.failed", (resp: any) => {
        console.error("payment.failed", resp);
        toast.error(resp?.error?.description || "Payment failed.");
        setPurchasing(null);
      });

      rzp.open();
    } catch (err: any) {
      console.error("Purchase exception", err);
      toast.error(err.message || "Unexpected error during checkout.");
      setPurchasing(null);
    }
  };

  if (sub.loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current plan card */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Your Plan</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{sub.planDef.tagline}</p>
            </div>
            <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
              {sub.planDef.name} · {sub.planDef.priceLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FEATURE_ORDER.map((f) => {
              const limit = sub.limitFor(f);
              const used = sub.usedFor(f);
              const isUnlimited = limit === Infinity;
              const pct = isUnlimited ? 0 : limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
              const remaining = sub.remainingFor(f);
              return (
                <div key={f} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {FEATURE_LABELS[f]}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {limit === 0 ? (
                        <span className="text-destructive">Not in plan</span>
                      ) : isUnlimited ? (
                        <>
                          <InfinityIcon className="h-3 w-3" /> Unlimited
                        </>
                      ) : (
                        <>{used} / {limit} used</>
                      )}
                    </span>
                  </div>
                  {!isUnlimited && limit > 0 && (
                    <>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {remaining} left this month
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade options */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Available Plans
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(CANDIDATE_PLANS) as CandidatePlan[]).map((id) => {
            const p = CANDIDATE_PLANS[id];
            const isCurrent = sub.plan === id;
            const isProcessing = purchasing === id;
            const isPaidPlan = id !== "basic";
            return (
              <Card
                key={id}
                className={`flex flex-col ${
                  p.highlight ? "border-primary shadow-md" : "border-border"
                } ${isCurrent ? "ring-2 ring-primary/40" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {p.highlight && (
                      <Badge variant="secondary" className="text-[10px]">
                        Popular
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-1">{p.priceLabel}</p>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-3">
                  <ul className="space-y-1.5 flex-1">
                    {p.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={isCurrent ? "outline" : p.highlight ? "default" : "outline"}
                      disabled={isCurrent || isProcessing || !isPaidPlan}
                      onClick={() => startPurchase(id)}
                      className="gap-1"
                    >
                      {isCurrent ? (
                        "Active"
                      ) : !isPaidPlan ? (
                        "Free tier"
                      ) : isProcessing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          Buy {p.name} <ArrowUpRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                    {isPaidPlan && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => navigate("/pricing")}
                        className="text-[11px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                      >
                        Compare on pricing page
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Skillory Voucher promo */}
      <SkilloryVoucherCard />

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Secure payments via Razorpay · UPI, Cards, Net Banking & Wallets supported · Plan activates instantly
      </div>
    </div>
  );
}
