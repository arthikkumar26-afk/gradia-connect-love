import { useState, type ReactNode } from "react";
import { Lock, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  FEATURE_UNLOCKS,
  FEATURE_BUNDLES,
  type UnlockFeature,
} from "@/config/featureUnlocks";
import { CANDIDATE_PLANS } from "@/config/candidatePlans";

declare global {
  interface Window { Razorpay: any }
}

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

interface LockedFeatureOverlayProps {
  feature: UnlockFeature;
  children: ReactNode; // sample/preview UI behind the blur-free overlay
  onUnlocked?: () => void;
  onOpenAllPlans?: () => void;
}

export const LockedFeatureOverlay = ({
  feature,
  children,
  onUnlocked,
  onOpenAllPlans,
}: LockedFeatureOverlayProps) => {
  const def = FEATURE_UNLOCKS[feature];
  const totalPack = FEATURE_BUNDLES.find((b) => b.id === "total_value")!;
  const elitePlan = CANDIDATE_PLANS.elite;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUnlock = async (
    amount: number,
    label: string,
    metaFeature: string,
  ) => {
    setLoading(true);
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
      const { data: orderData, error: orderErr } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount,
            plan_id: `unlock_${metaFeature}`,
            plan_name: label,
          },
        },
      );
      if (orderErr || !orderData?.order_id) {
        toast({
          title: "Payment setup failed",
          description: orderErr?.message || "Try again in a moment.",
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
          try {
            const features: UnlockFeature[] =
              metaFeature === "bundle_total_value"
                ? totalPack.features
                : metaFeature.startsWith("bundle_")
                ? (FEATURE_BUNDLES.find((b) => b.id === metaFeature.replace("bundle_", ""))?.features || [])
                : [feature];

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
              description: `${label} is now active for 1 month.`,
            });
            onUnlocked?.();
          } catch (e: any) {
            toast({
              title: "Recorded payment but failed to unlock",
              description: e?.message || "Contact support with your payment ID.",
              variant: "destructive",
            });
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast({
        title: "Something went wrong",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Sample/demo content underneath, slightly dimmed for context */}
      <div className="pointer-events-none select-none opacity-60">
        {children}
      </div>

      {/* Persistent unlock CTA banner on top */}
      <div className="absolute inset-0 flex items-start justify-center p-4 z-10">
        <Card className="w-full max-w-2xl mt-6 border-2 border-primary/40 shadow-2xl bg-background/95 backdrop-blur p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-lg font-bold">{def.label} is locked</h3>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> Preview below
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{def.tagline}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
                {def.perks.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-xs text-foreground/80">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="lg"
                  className="flex-1 font-semibold"
                  disabled={loading}
                  onClick={() => handleUnlock(def.price, def.label, def.id)}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Unlock for ₹{def.price.toLocaleString("en-IN")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 font-semibold border-primary/40"
                  disabled={loading}
                  onClick={() =>
                    handleUnlock(elitePlan.priceInr, elitePlan.name, "bundle_total_value")
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2 text-primary" />
                  Elite ₹{elitePlan.priceInr.toLocaleString("en-IN")}
                </Button>
              </div>

              {onOpenAllPlans && (
                <button
                  onClick={onOpenAllPlans}
                  className="text-xs text-primary hover:underline mt-3"
                >
                  See all bundles & smart combos →
                </button>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                One-time payment · Access valid for 1 month · Powered by Razorpay
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LockedFeatureOverlay;
