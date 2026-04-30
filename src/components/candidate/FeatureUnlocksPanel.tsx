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
      {/* Hero bundle */}
      <Card className="p-6 border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge className="mb-2 gap-1">
              <Sparkles className="h-3 w-3" /> Best Value
            </Badge>
            <h2 className="text-2xl font-bold">Total Value Pack</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Every feature unlocked. Best for serious job seekers.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">
              ₹{(45000).toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-success font-medium">
              Save ₹{bundleSavings(FEATURE_BUNDLES[3]).toLocaleString("en-IN")} vs individual
            </div>
          </div>
        </div>
        <Button
          className="mt-4 w-full sm:w-auto"
          size="lg"
          disabled={busy === "bundle_total_value"}
          onClick={() =>
            pay(45000, "Total Value Pack", "bundle_total_value", FEATURE_BUNDLES[3].features)
          }
        >
          {busy === "bundle_total_value" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Unlock Full Access
        </Button>
      </Card>

      {/* Smart Combos */}
      <div>
        <h3 className="text-lg font-semibold mb-3">💡 Smart Combos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURE_BUNDLES.filter((b) => b.id !== "total_value").map((b) => {
            const saved = bundleSavings(b);
            return (
              <Card
                key={b.id}
                className={`p-5 ${b.badge ? "border-primary/50 border-2" : ""}`}
              >
                {b.badge && (
                  <Badge className="mb-2">{b.badge}</Badge>
                )}
                <h4 className="font-bold">{b.name}</h4>
                <p className="text-xs text-muted-foreground mb-3">{b.description}</p>
                <div className="text-2xl font-bold mb-1">
                  ₹{b.price.toLocaleString("en-IN")}
                </div>
                {saved > 0 && (
                  <div className="text-xs text-success mb-3">
                    Save ₹{saved.toLocaleString("en-IN")}
                  </div>
                )}
                <ul className="space-y-1 mb-4">
                  {b.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs">
                      <Check className="h-3 w-3 text-success" />
                      {FEATURE_UNLOCKS[f].shortLabel}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={b.badge ? "default" : "outline"}
                  size="sm"
                  disabled={busy === `bundle_${b.id}`}
                  onClick={() =>
                    pay(b.price, b.name, `bundle_${b.id}`, b.features)
                  }
                >
                  {busy === `bundle_${b.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Get this Pack"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Individual features */}
      <div>
        <h3 className="text-lg font-semibold mb-3">🔓 What kind of service you required</h3>
        <div className="flex flex-col gap-3 max-w-2xl">
          {Object.values(FEATURE_UNLOCKS).map((f) => {
            const unlocked = isUnlocked(f.id);
            return (
              <Card key={f.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{f.label}</h4>
                  {unlocked && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Check className="h-3 w-3 text-success" /> Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2 flex-1">
                  {f.tagline}
                </p>
                <div className="text-xl font-bold mb-2">
                  ₹{f.price.toLocaleString("en-IN")}
                </div>
                {unlocked ? (
                  <p className="text-[11px] text-muted-foreground">
                    Active until {formatExpiry(expiresAt(f.id))}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === f.id}
                    onClick={() => pay(f.price, f.label, f.id, [f.id])}
                  >
                    {busy === f.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 mr-1" /> Unlock
                      </>
                    )}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeatureUnlocksPanel;
