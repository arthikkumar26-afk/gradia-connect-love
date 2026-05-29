import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Check, Copy, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  FREELANCER_PLANS,
  FREELANCER_PLAN_ORDER,
  type FreelancerPlan,
} from "@/config/freelancerPlans";

interface CouponRow {
  id: string;
  code: string;
  freelancer_plan_id: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
}

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function FreelancerAddOnSection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [purchasing, setPurchasing] = useState<FreelancerPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCoupons = async (uid: string) => {
    const { data } = await supabase
      .from("freelancer_plan_coupons")
      .select("id, code, freelancer_plan_id, status, created_at, redeemed_at")
      .eq("candidate_id", uid)
      .order("created_at", { ascending: false });
    setCoupons((data as CouponRow[]) || []);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await loadCoupons(user.id);
      }
      setLoading(false);
    })();
  }, []);

  const startPurchase = async (planId: FreelancerPlan) => {
    if (!userId) {
      toast.error("Please sign in first");
      return;
    }
    const plan = FREELANCER_PLANS[planId];
    setPurchasing(planId);
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Failed to load payment gateway");
        return;
      }
      const { data: orderRes, error: orderErr } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount: plan.priceInr,
            currency: "INR",
            plan_id: `freelancer_${planId}`,
            plan_name: `Freelancer ${plan.name}`,
          },
        },
      );
      if (orderErr || !orderRes?.order_id) {
        toast.error(orderRes?.error || "Could not start payment");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", userId).maybeSingle();

      const rzp = new (window as any).Razorpay({
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        order_id: orderRes.order_id,
        name: "Gradia",
        description: `${plan.name} Add-on`,
        prefill: { name: profile?.full_name || "", email: user?.email || "" },
        theme: { color: "#f97316" },
        handler: async (resp: any) => {
          try {
            const { data: verifyRes, error: verifyErr } = await supabase.functions.invoke(
              "issue-freelancer-coupon",
              {
                body: {
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  freelancer_plan_id: planId,
                  amount: plan.priceInr,
                },
              },
            );
            if (verifyErr || !verifyRes?.success) {
              toast.error(verifyRes?.error || "Verification failed");
              return;
            }
            toast.success(`Coupon issued: ${verifyRes.code}`);
            await loadCoupons(userId);
          } finally {
            setPurchasing(null);
          }
        },
        modal: { ondismiss: () => setPurchasing(null) },
      });
      rzp.on("payment.failed", () => {
        toast.error("Payment failed");
        setPurchasing(null);
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Checkout error");
      setPurchasing(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Coupon copied");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">Freelance Add-ons</h3>
        <Badge variant="secondary" className="text-[10px]">
          Unlock the Freelancer platform
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Buy any freelance pack or get an included combo coupon from eligible Candidate upgrade plans.
        Redeem the 100%-off coupon on the Freelancer signup page.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {FREELANCER_PLAN_ORDER.map((id) => {
          const p = FREELANCER_PLANS[id];
          const isProcessing = purchasing === id;
          return (
            <Card
              key={id}
              className={`flex flex-col ${p.highlight ? "border-orange-500 shadow-md" : "border-border"}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  {p.badge && (
                    <Badge variant="secondary" className="text-[10px]">{p.badge}</Badge>
                  )}
                </div>
                <p className="text-xl font-bold mt-1">{p.priceLabel}</p>
                <p className="text-[11px] text-muted-foreground">{p.bestFor}</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-3">
                <ul className="space-y-1 flex-1">
                  {p.perks.slice(0, 6).map((perk) => (
                    <li key={perk} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <Check className="h-3 w-3 text-orange-500 mt-0.5 shrink-0" />
                      <span>{perk}</span>
                    </li>
                  ))}
                  {p.perks.length > 6 && (
                    <li className="text-[10px] text-muted-foreground italic">
                      +{p.perks.length - 6} more
                    </li>
                  )}
                </ul>
                <Button
                  size="sm"
                  variant={p.highlight ? "default" : "outline"}
                  disabled={isProcessing}
                  onClick={() => startPurchase(id)}
                  className={p.highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Processing…
                    </>
                  ) : (
                    `Buy ${p.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Issued coupons */}
      {!loading && coupons.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ticket className="h-4 w-4 text-orange-500" />
              Your Freelancer Coupons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2.5"
              >
                <div className="flex flex-col">
                  <code className="text-xs font-mono font-bold text-foreground">{c.code}</code>
                  <span className="text-[10px] text-muted-foreground">
                    Freelancer {c.freelancer_plan_id} ·{" "}
                    {c.status === "redeemed" ? (
                      <span className="text-emerald-600">Redeemed</span>
                    ) : (
                      <span className="text-orange-600">Unused — redeem at /freelancer/signup</span>
                    )}
                  </span>
                </div>
                {c.status === "unused" && (
                  <Button size="sm" variant="ghost" onClick={() => copyCode(c.code)} className="h-7">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
