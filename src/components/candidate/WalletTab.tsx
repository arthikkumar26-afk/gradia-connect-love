import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
};

export default function WalletTab({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) fetchWallet();
  }, [userId]);

  const fetchWallet = async () => {
    setLoading(true);
    // Try to get existing wallet
    let { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data && !error) {
      // Create wallet with signup bonus
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

      // Add signup bonus transaction
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
      // Fetch transactions
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions((txns as Transaction[]) || []);
    }
    setLoading(false);
  };

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
          <p className="text-sm text-muted-foreground">Manage your balance, points & rewards</p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Cash Balance</span>
              <IndianRupee className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              ₹{wallet?.cash_balance?.toLocaleString("en-IN") || "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available for subscriptions & services</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Points Balance</span>
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
              {wallet?.points_balance?.toLocaleString("en-IN") || "0"} pts
            </div>
            <p className="text-xs text-muted-foreground mt-1">Earn from referrals, events & activities</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Reward Credits</span>
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
              {wallet?.rewards_balance?.toLocaleString("en-IN") || "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Redeem for premium features</p>
          </CardContent>
        </Card>
      </div>

      {/* How to earn */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            How to Earn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Complete Profile", pts: "+50 pts", icon: Award },
              { label: "Refer a Friend", pts: "+200 pts", icon: Users },
              { label: "Attend Mock Test", pts: "+30 pts", icon: BookOpen },
              { label: "Attend Event", pts: "+100 pts", icon: Star },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <item.icon className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-primary font-semibold">{item.pts}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
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
                        {txn.description || txn.category.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
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
    </div>
  );
}
