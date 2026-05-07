import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SkilloryVoucherCard from "./SkilloryVoucherCard";

interface Voucher {
  id: string;
  voucher_code: string;
  amount_paid: number;
  points_value: number;
  status: "purchased" | "redeemed";
  redeemed_at: string | null;
  created_at: string;
}

interface Props {
  walletId: string | null;
  currentPoints: number;
  onRedeemed?: (newBalance: number) => void;
}

export default function SkilloryVoucherWalletSection({ walletId, currentPoints, onRedeemed }: Props) {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchVouchers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const { data } = await supabase
      .from("skillory_vouchers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setVouchers((data as Voucher[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchVouchers(); }, []);

  const handleRedeem = async (v: Voucher) => {
    if (!walletId) { toast({ title: "Wallet not ready", variant: "destructive" }); return; }
    setRedeemingId(v.id);
    try {
      const newBalance = currentPoints + v.points_value;
      const { error: walErr } = await supabase.from("wallets").update({ points_balance: newBalance }).eq("id", walletId);
      if (walErr) throw walErr;
      const { error: vErr } = await supabase.from("skillory_vouchers")
        .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
        .eq("id", v.id);
      if (vErr) throw vErr;
      await supabase.from("wallet_transactions").insert({
        wallet_id: walletId,
        transaction_type: "credit",
        category: "voucher_redeem",
        amount: 0,
        points: v.points_value,
        description: `Skillory Voucher redeemed (${v.voucher_code})`,
        reference_id: v.voucher_code,
      });
      toast({
        title: "🎉 Voucher Redeemed!",
        description: `${v.points_value.toLocaleString("en-IN")} points added. New balance: ${newBalance.toLocaleString("en-IN")} pts.`,
      });
      onRedeemed?.(newBalance);
      await fetchVouchers();
    } catch (err: any) {
      toast({ title: "Redemption failed", description: err?.message, variant: "destructive" });
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <SkilloryVoucherCard onPurchased={fetchVouchers} />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Gift className="h-4 w-4 text-purple-600" /> Your Skillory Vouchers
            </h4>
            <p className="text-xs text-muted-foreground">Redeem to add points to your wallet (₹5 = 1 point)</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : vouchers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No vouchers yet. Buy one above to get {(10000).toLocaleString("en-IN")} bonus points.</p>
        ) : (
          <div className="space-y-2">
            {vouchers.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 bg-card">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono font-bold text-foreground">{v.voucher_code}</code>
                    {v.status === "redeemed" ? (
                      <Badge variant="secondary" className="bg-green-500/15 text-green-700 dark:text-green-300 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Redeemed</Badge>
                    ) : (
                      <Badge className="bg-purple-600 text-[10px]">Active</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Worth {v.points_value.toLocaleString("en-IN")} pts · Paid ₹{Number(v.amount_paid).toLocaleString("en-IN")}
                  </p>
                </div>
                {v.status === "purchased" ? (
                  <Button size="sm" onClick={() => handleRedeem(v)} disabled={redeemingId === v.id} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
                    {redeemingId === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Redeem"}
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">{v.redeemed_at ? new Date(v.redeemed_at).toLocaleDateString() : ""}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
