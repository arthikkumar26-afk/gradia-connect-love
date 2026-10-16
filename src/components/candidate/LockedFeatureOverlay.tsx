import { useState, type ReactNode } from "react";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const totalPack = FEATURE_BUNDLES.find((b) => b.id === "total_value");
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
                ? (totalPack?.features || [])
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" aria-label={`${def.label} payment options`}>
        <Button
          size="sm"
          disabled={loading}
          onClick={() => handleUnlock(def.price, def.label, def.id)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
          Activate · ₹{def.price.toLocaleString("en-IN")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => handleUnlock(elitePlan.priceInr, elitePlan.name, "bundle_total_value")}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Elite ₹{elitePlan.priceInr.toLocaleString("en-IN")}
        </Button>
        {onOpenAllPlans && (
          <Button size="sm" variant="link" onClick={onOpenAllPlans}>
            View plans <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
        <span className="text-xs text-muted-foreground">Access for 1 month</span>
      </div>
      <div className="pointer-events-none select-none" inert="">
        {children}
      </div>
    </div>
  );
};

export default LockedFeatureOverlay;
