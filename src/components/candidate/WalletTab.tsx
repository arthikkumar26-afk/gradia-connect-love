import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  IndianRupee,
  Star,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Plus,
  TrendingUp,
  Award,
  Users,
  Briefcase,
  BookOpen,
  FileText,
  Receipt,
  PieChart,
  CreditCard,
  Loader2,
  Download,
  Ticket,
  RefreshCw,
  Coins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PointsPricingPanel from "./PointsPricingPanel";
import TransactionHistoryPanel from "./TransactionHistoryPanel";
import SkilloryVoucherWalletSection from "./SkilloryVoucherWalletSection";

// ₹5000 = 1000 points → ₹5 = 1 point
const RUPEE_PER_POINT = 5;

const POINT_PACKAGES = [
  // TEST MODE: Starter reduced to ₹1 for payment testing
  { points: 400, price: 1, popular: false, label: "Starter" },
  { points: 1000, price: 5000, popular: false, label: "Basic" },
  { points: 2000, price: 10000, popular: true, label: "Pro" },
  { points: 5000, price: 25000, popular: false, label: "Premium" },
];

interface WalletData {
  id: string;
  cash_balance: number;
  points_balance: number;
  rewards_balance: number;
}

interface Transaction {
  id: string;
  transaction_type: string;
  category: string;
  amount: number;
  points: number;
  rewards: number;
  description: string | null;
  created_at: string;
}

const categoryIcons: Record<string, any> = {
  deposit: IndianRupee,
  withdrawal: IndianRupee,
  referral: Users,
  event: Award,
  subscription: TrendingUp,
  mock_test: BookOpen,
  resume_builder: FileText,
  sponsorship: Star,
  reward: Gift,
  signup_bonus: Gift,
  profile_complete: Award,
  interview: Briefcase,
  point_purchase: CreditCard,
};

const categoryColors: Record<string, string> = {
  deposit: "text-green-600 bg-green-100",
  withdrawal: "text-red-600 bg-red-100",
  referral: "text-blue-600 bg-blue-100",
  event: "text-purple-600 bg-purple-100",
  subscription: "text-orange-600 bg-orange-100",
  mock_test: "text-cyan-600 bg-cyan-100",
  resume_builder: "text-indigo-600 bg-indigo-100",
  sponsorship: "text-yellow-600 bg-yellow-100",
  reward: "text-pink-600 bg-pink-100",
  signup_bonus: "text-emerald-600 bg-emerald-100",
  profile_complete: "text-teal-600 bg-teal-100",
  interview: "text-violet-600 bg-violet-100",
  point_purchase: "text-green-600 bg-green-100",
};

const categoryLabels: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  referral: "Referral Bonus",
  event: "Event Reward",
  subscription: "Subscription",
  mock_test: "Mock Test",
  resume_builder: "Resume Export",
  sponsorship: "Sponsorship",
  reward: "Reward",
  signup_bonus: "Signup Bonus",
  profile_complete: "Profile Complete",
  interview: "Interview",
  point_purchase: "Point Purchase",
};

export default function WalletTab({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPkg, setBuyingPkg] = useState<number | null>(null);
  const [myReferralCode, setMyReferralCode] = useState<string>("");
  const [bonusCode, setBonusCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [freePointsCoupon, setFreePointsCoupon] = useState<{ id: string; max: number | null } | null>(null);
  const [freePointsAmount, setFreePointsAmount] = useState<string>("");
  const [pendingRedeem, setPendingRedeem] = useState<{ points: number; couponId: string; code: string } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [balancePulse, setBalancePulse] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) fetchWallet();
  }, [userId]);

  const fetchWallet = async () => {
    setLoading(true);
    let { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data && !error) {
      const { data: newWallet, error: createErr } = await supabase
        .from("wallets")
        .insert({ user_id: userId, cash_balance: 0, points_balance: 100, rewards_balance: 10 })
        .select()
        .single();

      if (createErr) {
        toast({ title: "Error", description: "Could not create wallet", variant: "destructive" });
        setLoading(false);
        return;
      }
      data = newWallet;

      if (data) {
        await supabase.from("wallet_transactions").insert({
          wallet_id: data.id,
          transaction_type: "credit",
          category: "signup_bonus",
          points: 100,
          rewards: 10,
          description: "Welcome bonus for joining Gradia",
        });
      }
    }

    if (data) {
      setWallet(data as WalletData);
      const [{ data: txns }, { data: profileData }] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", data.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("profiles")
          .select("referral_code")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      setTransactions((txns as Transaction[]) || []);
      if (profileData?.referral_code) setMyReferralCode(profileData.referral_code);
    }
    setLoading(false);
  };


  const creditPoints = async (points: number, couponId: string, code: string) => {
    if (!wallet) return;
    const newBalance = (wallet.points_balance || 0) + points;
    const { error: updErr } = await supabase.from("wallets").update({ points_balance: newBalance }).eq("id", wallet.id);
    if (updErr) throw updErr;

    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      transaction_type: "credit",
      category: "reward",
      points,
      description: `Bonus points redeemed via coupon ${code}`,
    });

    await supabase.from("coupon_usages").insert({
      coupon_id: couponId,
      user_id: userId,
      user_role: "candidate",
      plan_name: "Wallet Bonus",
      original_amount: 0,
      discount_applied: points,
      final_amount: 0,
    });

    try { await supabase.rpc("increment_coupon_usage", { coupon_id_input: couponId }); } catch {}

    // Re-fetch wallet to get the actual latest balance from server
    const { data: refreshedWallet } = await supabase
      .from("wallets")
      .select("points_balance")
      .eq("id", wallet.id)
      .single();
    const actualBalance = refreshedWallet?.points_balance ?? newBalance;

    // Update local state with fresh data
    setWallet((prev) => prev ? { ...prev, points_balance: actualBalance } : prev);

    toast({
      title: "🎉 Points Added!",
      description: `${points} pts credited. New balance: ${actualBalance} pts.`,
    });
    setBonusCode("");
    await fetchWallet(); // Also refresh transactions list
    return actualBalance;
  };

  const confirmRedeem = async () => {
    if (!pendingRedeem) return;
    setRedeeming(true);
    try {
      await creditPoints(pendingRedeem.points, pendingRedeem.couponId, pendingRedeem.code);
      setPendingRedeem(null);
      setFreePointsCoupon(null);
      setFreePointsAmount("");
      // Trigger pulse animation on balance immediately
      setBalancePulse(true);
      setTimeout(() => setBalancePulse(false), 1500);
      // Auto re-fetch from server after toast finishes animating (~4s)
      setTimeout(() => {
        fetchWallet();
        setBalancePulse(true);
        setTimeout(() => setBalancePulse(false), 1200);
      }, 4200);
    } catch (err: any) {
      toast({ title: "Could not redeem", description: err.message || "Failed", variant: "destructive" });
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeemBonusCode = async () => {
    if (!wallet || !bonusCode.trim()) return;
    setRedeeming(true);
    try {
      const code = bonusCode.toUpperCase().trim();
      const { data: coupon, error: cErr } = await supabase
        .from("discount_coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (cErr) throw cErr;
      if (!coupon) throw new Error("Invalid or inactive coupon code");
      if (coupon.discount_type !== "bonus_points" && coupon.discount_type !== "free_points") {
        throw new Error("This coupon is not a wallet bonus code");
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) throw new Error("This coupon has expired");
      if (coupon.max_total_uses && coupon.total_used >= coupon.max_total_uses) throw new Error("This coupon has reached its usage limit");

      const { count: myUses } = await supabase
        .from("coupon_usages")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", userId);

      if (myUses !== null && coupon.max_uses_per_user && myUses >= coupon.max_uses_per_user) {
        throw new Error("You have already redeemed this coupon");
      }

      if (coupon.applicable_to && coupon.applicable_to !== "both" && coupon.applicable_to !== "wallet") {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
        if (profile?.role && profile.role !== coupon.applicable_to) throw new Error("This coupon is not available for your account type");
      }

      if (coupon.discount_type === "free_points") {
        setFreePointsCoupon({ id: coupon.id, max: coupon.max_discount_amount });
        toast({ title: "✓ Code valid", description: `Enter the points you'd like to add${coupon.max_discount_amount ? ` (max ${coupon.max_discount_amount})` : ""}.` });
      } else {
        const points = Number(coupon.discount_value) || 0;
        if (points <= 0) throw new Error("Invalid coupon value");
        setPendingRedeem({ points, couponId: coupon.id, code });
      }
    } catch (err: any) {
      toast({ title: "Could not redeem", description: err.message || "Failed to redeem coupon", variant: "destructive" });
    } finally {
      setRedeeming(false);
    }
  };

  const handleClaimFreePoints = () => {
    if (!freePointsCoupon || !wallet) return;
    const amount = parseInt(freePointsAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive number of points", variant: "destructive" });
      return;
    }
    if (freePointsCoupon.max && amount > freePointsCoupon.max) {
      toast({ title: "Over the limit", description: `Maximum ${freePointsCoupon.max} points allowed`, variant: "destructive" });
      return;
    }
    setPendingRedeem({ points: amount, couponId: freePointsCoupon.id, code: bonusCode.toUpperCase().trim() });
  };

  const handleBuyPoints = async (pkg: typeof POINT_PACKAGES[0]) => {
    if (!wallet) return;
    setBuyingPkg(pkg.points);
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: pkg.price, currency: "INR", receipt: `wal_${wallet.id.slice(0, 8)}_${pkg.points}` },
      });

      if (orderError || !orderData?.order_id) {
        console.error("Wallet order creation failed", { orderError, orderData, amount: pkg.price, points: pkg.points });
        throw new Error(orderError?.message || orderData?.error || "Failed to create payment order");
      }

      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load payment gateway"));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: orderData.key_id,
        amount: pkg.price * 100,
        currency: "INR",
        name: "Gradia",
        description: `Buy ${pkg.points} Wallet Points`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyError || !verifyData?.verified) {
              throw new Error("Payment verification failed");
            }

            // Credit points to wallet
            const newBalance = (wallet.points_balance || 0) + pkg.points;
            await supabase.from("wallets").update({ points_balance: newBalance }).eq("id", wallet.id);

            // Record transaction
            await supabase.from("wallet_transactions").insert({
              wallet_id: wallet.id,
              transaction_type: "credit",
              category: "point_purchase",
              amount: pkg.price,
              points: pkg.points,
              description: `Purchased ${pkg.points} points for ₹${pkg.price.toLocaleString("en-IN")}`,
            });

            let finalBalance = newBalance;

            // Check & process referral bonus (first purchase only)
            try {
              const { data: myProfile } = await supabase
                .from("profiles")
                .select("referred_by, referral_bonus_given")
                .eq("id", userId)
                .maybeSingle();

              if (myProfile?.referred_by && !myProfile?.referral_bonus_given) {
                // Find the referrer by their referral_code
                const { data: referrer } = await supabase
                  .from("profiles")
                  .select("id")
                  .eq("referral_code", myProfile.referred_by)
                  .maybeSingle();

                if (referrer) {
                  // Credit +50 to new user (me)
                  await supabase.from("wallets").update({
                    points_balance: newBalance + 50,
                  }).eq("id", wallet.id);

                  await supabase.from("wallet_transactions").insert({
                    wallet_id: wallet.id,
                    transaction_type: "credit",
                    category: "referral",
                    points: 50,
                    description: "Referral bonus — welcome reward for signing up via referral",
                  });

                  // Credit +50 to referrer
                  const { data: referrerWallet } = await supabase
                    .from("wallets")
                    .select("id, points_balance")
                    .eq("user_id", referrer.id)
                    .maybeSingle();

                  if (referrerWallet) {
                    await supabase.from("wallets").update({
                      points_balance: (referrerWallet.points_balance || 0) + 50,
                    }).eq("id", referrerWallet.id);

                    await supabase.from("wallet_transactions").insert({
                      wallet_id: referrerWallet.id,
                      transaction_type: "credit",
                      category: "referral",
                      points: 50,
                      description: "Referral bonus — your referred friend made their first purchase!",
                    });
                  }

                  // Mark bonus as given
                  await supabase.from("profiles").update({ referral_bonus_given: true }).eq("id", userId);

                  toast({ title: "🎉 Referral Bonus!", description: "You and your referrer both earned 50 bonus points!" });
                  finalBalance = newBalance + 50;
                }
              }
            } catch (refErr) {
              console.error("Referral bonus processing error:", refErr);
            }

            // Re-fetch wallet to get the actual latest balance from server
            const { data: refreshedWallet } = await supabase
              .from("wallets")
              .select("points_balance")
              .eq("id", wallet.id)
              .single();
            const actualBalance = refreshedWallet?.points_balance ?? finalBalance;

            toast({ title: "✅ Points Added!", description: `${pkg.points} points added. New balance: ${actualBalance} pts.` });

            await fetchWallet();
          } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to add points", variant: "destructive" });
          }
        },
        theme: { color: "#10b981" },
        modal: {
          ondismiss: () => setBuyingPkg(null),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Wallet top-up failed", err);
      toast({ title: "Error", description: err.message || "Payment failed", variant: "destructive" });
    } finally {
      setBuyingPkg(null);
    }
  };

  // Usage breakdown
  const usageBreakdown = transactions
    .filter((t) => t.transaction_type === "debit")
    .reduce((acc, txn) => {
      const cat = txn.category || "other";
      if (!acc[cat]) acc[cat] = { points: 0, count: 0 };
      acc[cat].points += txn.points || 0;
      acc[cat].count += 1;
      return acc;
    }, {} as Record<string, { points: number; count: number }>);

  const totalSpent = Object.values(usageBreakdown).reduce((s, v) => s + v.points, 0);
  const totalEarned = transactions
    .filter((t) => t.transaction_type === "credit")
    .reduce((s, t) => s + (t.points || 0), 0);

  // Invoice-like receipts (point purchases only)
  const purchaseReceipts = transactions.filter((t) => t.category === "point_purchase" && t.transaction_type === "credit");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Wallet</h2>
          <p className="text-sm text-muted-foreground">Manage your points, load balance & track usage</p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Points Balance</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100/60 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                  onClick={async () => {
                    setBalancePulse(true);
                    await fetchWallet();
                    setTimeout(() => setBalancePulse(false), 1200);
                    toast({ title: "Balance refreshed", description: "Wallet synced with the latest server value." });
                  }}
                  disabled={loading}
                  title="Refresh balance"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className={`text-3xl font-bold text-yellow-700 dark:text-yellow-400 transition-all duration-500 ${balancePulse ? "scale-110 drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]" : "scale-100"}`}>
              {wallet?.points_balance?.toLocaleString("en-IN") || "0"} pts
            </div>
            <p className="text-xs text-muted-foreground mt-1">Use for subscriptions, services & features</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Total Earned</span>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {totalEarned.toLocaleString("en-IN")} pts
            </div>
            <p className="text-xs text-muted-foreground mt-1">From purchases, referrals & rewards</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Total Used</span>
              <PieChart className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
              {totalSpent.toLocaleString("en-IN")} pts
            </div>
            <p className="text-xs text-muted-foreground mt-1">Spent on plans, exports & services</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pricing" className="gap-1 text-xs"><Coins className="h-3 w-3" /> Points Guide</TabsTrigger>
          <TabsTrigger value="load" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Load Points</TabsTrigger>
          <TabsTrigger value="voucher" className="gap-1 text-xs"><Gift className="h-3 w-3" /> Skillory Voucher</TabsTrigger>
          <TabsTrigger value="usage" className="gap-1 text-xs"><PieChart className="h-3 w-3" /> Usage</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1 text-xs"><Receipt className="h-3 w-3" /> Invoices</TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs"><Clock className="h-3 w-3" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="voucher" className="mt-4">
          <SkilloryVoucherWalletSection
            walletId={wallet?.id || null}
            currentPoints={wallet?.points_balance || 0}
            onRedeemed={(newBal) => {
              setWallet((prev) => prev ? { ...prev, points_balance: newBal } : prev);
              fetchWallet();
            }}
          />
        </TabsContent>

        {/* Pricing & Pipeline (per-feature deduction breakdown) */}
        <TabsContent value="pricing" className="mt-4">
          <PointsPricingPanel userId={userId} />
        </TabsContent>

        {/* Load Points */}
        <TabsContent value="load" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Buy Points
              </CardTitle>
              <CardDescription>₹{RUPEE_PER_POINT} = 1 point. Points never expire.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {POINT_PACKAGES.map((pkg) => (
                  <Card
                    key={pkg.points}
                    className={`relative cursor-pointer transition-all hover:shadow-md ${
                      pkg.popular ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground">
                        Best Value
                      </Badge>
                    )}
                    <CardContent className="p-4 text-center space-y-2">
                      <div className="text-2xl font-bold text-foreground">{pkg.points.toLocaleString("en-IN")} pts</div>
                      <div className="text-lg font-semibold text-primary">₹{pkg.price.toLocaleString("en-IN")}</div>
                      <p className="text-[10px] text-muted-foreground">₹{RUPEE_PER_POINT}/point</p>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        variant={pkg.popular ? "default" : "outline"}
                        disabled={buyingPkg === pkg.points}
                        onClick={() => handleBuyPoints(pkg)}
                      >
                        {buyingPkg === pkg.points ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Processing</>
                        ) : (
                          <><Plus className="h-3 w-3 mr-1" /> Buy Now</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 dark:from-yellow-950/10 dark:to-amber-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="h-5 w-5 text-yellow-600" />
                Redeem Bonus Code
              </CardTitle>
              <CardDescription>Have a promo code? Enter it below to instantly add bonus points to your wallet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={bonusCode}
                  onChange={(e) => { setBonusCode(e.target.value.toUpperCase()); setFreePointsCoupon(null); setFreePointsAmount(""); }}
                  placeholder="Enter coupon code (e.g. WELCOME500)"
                  className="uppercase font-mono"
                  disabled={redeeming}
                />
                <Button
                  onClick={handleRedeemBonusCode}
                  disabled={redeeming || !bonusCode.trim() || !!freePointsCoupon}
                  className="sm:w-auto"
                >
                  {redeeming ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validating</>
                  ) : (
                    <><Gift className="h-4 w-4 mr-2" /> Apply</>
                  )}
                </Button>
              </div>

              {freePointsCoupon && (
                <div className="rounded-md border border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-3 space-y-2">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    ✓ Code accepted — choose how many points to add for FREE
                    {freePointsCoupon.max ? ` (max ${freePointsCoupon.max})` : ""}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={freePointsCoupon.max || undefined}
                      value={freePointsAmount}
                      onChange={(e) => setFreePointsAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      disabled={redeeming}
                    />
                    <Button onClick={handleClaimFreePoints} disabled={redeeming || !freePointsAmount} className="sm:w-auto">
                      {redeeming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding</> : <><Plus className="h-4 w-4 mr-2" /> Add Points</>}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Bonus codes are issued by Gradia admins for promotions, contests & referral campaigns.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Breakdown */}
        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Points Usage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(usageBreakdown).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PieChart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No usage yet</p>
                  <p className="text-xs mt-1">Points spent on services will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(usageBreakdown)
                    .sort((a, b) => b[1].points - a[1].points)
                    .map(([cat, data]) => {
                      const Icon = categoryIcons[cat] || IndianRupee;
                      const colorClass = categoryColors[cat] || "text-gray-600 bg-gray-100";
                      const pct = totalSpent > 0 ? Math.round((data.points / totalSpent) * 100) : 0;
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">{categoryLabels[cat] || cat.replace(/_/g, " ")}</p>
                              <span className="text-sm font-semibold text-foreground">{data.points} pts</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{data.count} transaction{data.count > 1 ? "s" : ""} • {pct}%</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices / Receipts */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Purchase Invoices
              </CardTitle>
              <CardDescription>Receipts for point purchases via payment gateway</CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseReceipts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No purchase invoices yet</p>
                  <p className="text-xs mt-1">Buy points to see your receipts here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchaseReceipts.map((txn, idx) => (
                    <div key={txn.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Invoice #{purchaseReceipts.length - idx}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">Paid</Badge>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium text-foreground">
                            {new Date(txn.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount Paid</p>
                          <p className="font-medium text-green-600">₹{txn.amount?.toLocaleString("en-IN") || "0"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Points Credited</p>
                          <p className="font-medium text-yellow-600">{txn.points?.toLocaleString("en-IN") || "0"} pts</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Description</p>
                          <p className="font-medium text-foreground">{txn.description || "Point purchase"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History */}
        <TabsContent value="history" className="mt-4">
          <TransactionHistoryPanel transactions={transactions} />
        </TabsContent>
      </Tabs>

      {/* Earn Free Points - Always Visible */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Earn Free Points
          </CardTitle>
          <CardDescription>Complete actions to earn bonus points for free</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Complete Profile", pts: "+50 pts", icon: Award, desc: "Fill all profile fields" },
              { label: "Refer a Friend", pts: "+50 pts", icon: Users, desc: "Earn after their first purchase" },
              { label: "Attend Mock Test", pts: "+30 pts", icon: BookOpen, desc: "Take any mock test" },
              { label: "Attend Event", pts: "+100 pts", icon: Star, desc: "Join a Job Mela event" },
            ].map((item) => (
              <Card key={item.label} className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                    <Badge variant="secondary" className="mt-1.5 text-xs font-bold text-primary">{item.pts}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Referral Section */}
          <Separator className="my-4" />
          <div className="p-4 rounded-lg bg-muted/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Refer a Friend & Earn 50 pts</p>
                <p className="text-xs text-muted-foreground">Share your referral code. After their first purchase, you both get 50 bonus points!</p>
              </div>
            </div>

            {/* Show referral code prominently */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-primary/30 bg-background">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Your Code:</span>
                <span className="text-lg font-bold tracking-widest text-primary">{myReferralCode || "Loading..."}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    const code = myReferralCode || userId.slice(0, 8);
                    navigator.clipboard.writeText(code);
                    toast({ title: "📋 Code Copied!", description: `Referral code "${code}" copied to clipboard.` });
                  }}
                >
                  <FileText className="h-3.5 w-3.5" /> Copy Code
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const code = myReferralCode || userId.slice(0, 8);
                    const referralLink = `${window.location.origin}/candidate/signup?ref=${code}`;
                    navigator.clipboard.writeText(referralLink);
                    toast({ title: "🔗 Link Copied!", description: "Share this link with friends. You both earn 50 pts after their first purchase!" });
                  }}
                >
                  <Users className="h-3.5 w-3.5" /> Copy Link
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              New users can enter your code during signup at <span className="font-medium text-foreground">/candidate/signup?ref=YOUR_CODE</span> or paste the link directly.
            </p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingRedeem} onOpenChange={(open) => { if (!open && !redeeming) setPendingRedeem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Redemption</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {pendingRedeem && wallet ? (
                <div className="space-y-2">
                  <p>
                    You are about to redeem <span className="font-semibold text-foreground">{pendingRedeem.points} pts</span> using code{" "}
                    <span className="font-mono font-semibold text-foreground">{pendingRedeem.code}</span>.
                  </p>
                  <p>Current balance: <span className="font-semibold text-foreground">{wallet.points_balance || 0} pts</span></p>
                  <p>New balance after redemption: <span className="font-semibold text-accent">{(wallet.points_balance || 0) + pendingRedeem.points} pts</span></p>
                </div>
              ) : <span />}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={redeeming}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmRedeem(); }} disabled={redeeming}>
              {redeeming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redeeming</> : "Confirm & Add Points"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
