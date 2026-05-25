import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  FEATURE_UNLOCKS,
  FEATURE_BUNDLES,
  bundleSavings,
  type UnlockFeature,
} from "@/config/featureUnlocks";
import { useFeatureUnlocks } from "@/hooks/useFeatureUnlocks";
import { CANDIDATE_PLANS, CANDIDATE_PLAN_ORDER } from "@/config/candidatePlans";

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export const FeatureUnlocksPanel = () => {
  const { toast } = useToast();
  const { isUnlocked, expiresAt, refresh } = useFeatureUnlocks();
  const [busy, setBusy] = useState<string | null>(null);

  const pay = async (
    amount: number,
    label: string,
    metaKey: string,
    features: UnlockFeature[],
  ) => {
    setBusy(metaKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please sign in again", variant: "destructive" });
        return;
      }
      const ok = await loadRazorpayScript();
      if (!ok) {
        toast({ title: "Could not load payment gateway", variant: "destructive" });
        return;
      }
      const { data: orderData, error } = await supabase.functions.invoke(
        "create-razorpay-order",
        { body: { amount, plan_id: metaKey, plan_name: label } },
      );
      if (error || !orderData?.order_id) {
        toast({
          title: "Payment setup failed",
          description: error?.message,
          variant: "destructive",
        });
        return;
      }
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: "Gradia",
        description: label,
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          const rows = features.map((f) => ({
            candidate_id: session.user.id,
            feature: f,
            amount_paid: amount,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          }));
          await supabase.from("candidate_feature_unlocks" as any).insert(rows);
          toast({
            title: "Unlocked!",
            description: `${label} active for 1 month.`,
          });
          await refresh();
        },
        modal: { ondismiss: () => setBusy(null) },
      };
      new (window as any).Razorpay(options).open();
    } finally {
      setBusy(null);
    }
  };

  const formatExpiry = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {CANDIDATE_PLAN_ORDER.map((id) => {
          const plan = CANDIDATE_PLANS[id];
          return (
            <Card key={id} className={`p-5 flex flex-col ${plan.highlight ? "border-primary/50 border-2 shadow-md" : ""}`}>
              {plan.badge && <Badge className="mb-2 w-fit gap-1"><Sparkles className="h-3 w-3" /> {plan.badge}</Badge>}
              <h4 className="font-bold text-base">{plan.name}</h4>
              <p className="text-xs text-muted-foreground mb-3">{plan.bestFor}</p>
              <div className="text-2xl font-bold mb-1">₹{plan.priceInr.toLocaleString("en-IN")}</div>
              <p className="text-[11px] text-muted-foreground mb-3">{plan.priceLabel}</p>
              <ul className="space-y-1.5 flex-1 mb-4">
                {plan.perks.slice(0, 6).map((perk) => (
                  <li key={perk} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-success mt-0.5 shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.highlight ? "default" : "outline"} size="sm" onClick={() => window.location.assign("/pricing")}>Compare Plan</Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureUnlocksPanel;
