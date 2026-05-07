import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, CreditCard, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SKILLORY_VOUCHER_PRICE = 50000;
export const SKILLORY_VOUCHER_POINTS = 10000; // ₹5 = 1 pt

declare global {
  interface Window { Razorpay: any; }
}

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const generateVoucherCode = () =>
  "SKL-" + Math.random().toString(36).slice(2, 6).toUpperCase() +
  "-" + Math.random().toString(36).slice(2, 6).toUpperCase() +
  "-" + Date.now().toString(36).toUpperCase().slice(-4);

interface Props {
  className?: string;
  compact?: boolean;
  onPurchased?: () => void;
}

export default function SkilloryVoucherCard({ className = "", compact = false, onPurchased }: Props) {
  const { toast } = useToast();
  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    setBuying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in", description: "Sign in to purchase a Skillory Voucher.", variant: "destructive" });
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) { toast({ title: "Payment gateway failed to load", variant: "destructive" }); return; }

      const { data: orderData, error: orderErr } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: SKILLORY_VOUCHER_PRICE,
          currency: "INR",
          plan_id: "skillory_voucher",
          plan_name: "Skillory Voucher ₹50,000",
          receipt: `skl_vch_${Date.now()}`,
        },
      });
      if (orderErr || !orderData?.order_id) throw new Error(orderErr?.message || "Failed to create order");

      const code = generateVoucherCode();
      const options: any = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Gradia × Skillory",
        description: `Skillory Voucher · Worth ${SKILLORY_VOUCHER_POINTS.toLocaleString("en-IN")} wallet points`,
        order_id: orderData.order_id,
        prefill: { email: user.email || "" },
        theme: { color: "#7c3aed" },
        handler: async (response: any) => {
          try {
            // Verify
            await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            // Insert voucher record
            const { error: insErr } = await supabase.from("skillory_vouchers").insert({
              user_id: user.id,
              voucher_code: code,
              amount_paid: SKILLORY_VOUCHER_PRICE,
              points_value: SKILLORY_VOUCHER_POINTS,
              status: "purchased",
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
            });
            if (insErr) throw insErr;
            toast({
              title: "🎉 Skillory Voucher Purchased!",
              description: `Code: ${code} — Redeem it from your Wallet to get ${SKILLORY_VOUCHER_POINTS.toLocaleString("en-IN")} points.`,
            });
            onPurchased?.();
          } catch (e: any) {
            toast({ title: "Voucher activation failed", description: e?.message || "Contact support.", variant: "destructive" });
          } finally {
            setBuying(false);
          }
        },
        modal: { ondismiss: () => setBuying(false) },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", () => { toast({ title: "Payment Failed", variant: "destructive" }); setBuying(false); });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Could not start payment", description: err?.message, variant: "destructive" });
      setBuying(false);
    }
  };

  return (
    <Card className={`p-5 border-2 border-purple-400/40 bg-gradient-to-br from-purple-500/5 via-card to-pink-500/5 shadow-lg ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-purple-500/15 flex items-center justify-center">
            <Gift className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base flex items-center gap-1.5">
              Skillory Voucher
              <Badge variant="secondary" className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px]">
                <Sparkles className="h-3 w-3 mr-1" /> Special Offer
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">Buy once on Gradia · Redeem on Skillory.in</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-600">₹{SKILLORY_VOUCHER_PRICE.toLocaleString("en-IN")}</div>
          <p className="text-[10px] text-muted-foreground">one-time</p>
        </div>
      </div>

      {!compact && (
        <ul className="space-y-1.5 mb-4 text-xs text-muted-foreground">
          <li className="flex items-start gap-2"><span className="text-purple-600">✓</span> Worth <strong className="text-foreground">{SKILLORY_VOUCHER_POINTS.toLocaleString("en-IN")} wallet points</strong> after redemption</li>
          <li className="flex items-start gap-2"><span className="text-purple-600">✓</span> Redeem any time inside your Gradia Wallet</li>
          <li className="flex items-start gap-2"><span className="text-purple-600">✓</span> Use points across all Skillory courses & services</li>
          <li className="flex items-start gap-2"><span className="text-purple-600">✓</span> Voucher code emailed instantly after purchase</li>
        </ul>
      )}

      <Button onClick={handleBuy} disabled={buying} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
        {buying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</> :
          <><CreditCard className="h-4 w-4 mr-2" /> Buy Skillory Voucher · ₹{SKILLORY_VOUCHER_PRICE.toLocaleString("en-IN")}</>}
      </Button>
    </Card>
  );
}
