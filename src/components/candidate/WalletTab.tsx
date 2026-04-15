import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ₹5000 = 1000 points → ₹5 = 1 point
const RUPEE_PER_POINT = 5;

const POINT_PACKAGES = [
  { points: 200, price: 1000, popular: false },
  { points: 500, price: 2500, popular: false },
  { points: 1000, price: 5000, popular: true },
  { points: 2000, price: 10000, popular: false },
  { points: 5000, price: 25000, popular: false },
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
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", data.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setTransactions((txns as Transaction[]) || []);
    }
    setLoading(false);
  };

  const handleBuyPoints = async (pkg: typeof POINT_PACKAGES[0]) => {
    if (!wallet) return;
    setBuyingPkg(pkg.points);
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: pkg.price, currency: "INR", receipt: `wallet_${wallet.id}_${pkg.points}pts` },
      });

      if (orderError || !orderData?.order_id) {
        throw new Error("Failed to create payment order");
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

            toast({ title: "✅ Points Added!", description: `${pkg.points} points added to your wallet.` });
            fetchWallet();
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
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
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

      <Tabs defaultValue="load" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="load" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Load Points</TabsTrigger>
          <TabsTrigger value="usage" className="gap-1 text-xs"><PieChart className="h-3 w-3" /> Usage</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1 text-xs"><Receipt className="h-3 w-3" /> Invoices</TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs"><Clock className="h-3 w-3" /> History</TabsTrigger>
        </TabsList>

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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No transactions yet</p>
                  <p className="text-xs mt-1">Your wallet activity will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => {
                    const Icon = categoryIcons[txn.category] || IndianRupee;
                    const colorClass = categoryColors[txn.category] || "text-gray-600 bg-gray-100";
                    const isCredit = txn.transaction_type === "credit";
                    return (
                      <div key={txn.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {txn.description || (categoryLabels[txn.category] || txn.category.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(txn.created_at).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          {txn.amount > 0 && (
                            <p className={`text-sm font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                              {isCredit ? "+" : "-"}₹{txn.amount}
                            </p>
                          )}
                          {txn.points > 0 && (
                            <p className={`text-xs font-medium ${isCredit ? "text-yellow-600" : "text-red-500"}`}>
                              {isCredit ? "+" : "-"}{txn.points} pts
                            </p>
                          )}
                          {txn.rewards > 0 && (
                            <p className={`text-xs font-medium ${isCredit ? "text-purple-600" : "text-red-500"}`}>
                              {isCredit ? "+" : "-"}{txn.rewards} rewards
                            </p>
                          )}
                        </div>
                        <div>
                          {isCredit ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
              { label: "Refer a Friend", pts: "+200 pts", icon: Users, desc: "Share your referral link" },
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Refer a Friend & Earn 200 pts</p>
                <p className="text-xs text-muted-foreground">Share your referral link. When they sign up, you both get bonus points!</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => {
                const referralLink = `${window.location.origin}/candidate/signup?ref=${userId.slice(0, 8)}`;
                navigator.clipboard.writeText(referralLink);
                toast({ title: "📋 Referral Link Copied!", description: "Share it with your friends to earn 200 points each." });
              }}
            >
              <Users className="h-3.5 w-3.5" /> Copy Referral Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
