import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Wallet, ArrowDownLeft, ArrowUpRight, Filter } from "lucide-react";

interface Txn {
  id: string;
  category: string;
  transaction_type: "credit" | "debit" | string;
  amount: number;
  points: number;
  rewards: number;
  description: string | null;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  signup_bonus: "Signup Bonus",
  reward: "Coupon Reward",
  referral: "Referral Bonus",
  point_purchase: "Wallet Top-up",
  manual_topup: "Manual Top-up",
  ai_job_apply: "AI Job Apply",
  resume_export: "Resume PDF Export",
  mock_interview: "Mock Interview",
  subscription: "Subscription",
  cv_unlock: "CV Unlock",
  mentor_unlock: "Mentor Unlock",
};

const formatLabel = (cat: string) =>
  categoryLabels[cat] || cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function TransactionHistoryPanel({ transactions }: { transactions: Txn[] }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const sources = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category));
    return Array.from(set);
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false;
      if (sourceFilter !== "all" && t.category !== sourceFilter) return false;
      if (fromDate && new Date(t.created_at) < new Date(fromDate)) return false;
      if (toDate && new Date(t.created_at) > new Date(toDate + "T23:59:59")) return false;
      return true;
    });
  }, [transactions, typeFilter, sourceFilter, fromDate, toDate]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Transaction History
            <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
          </CardTitle>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Filter className="h-3 w-3" /> Type
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credit (In)</SelectItem>
                <SelectItem value="debit">Debit (Out)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Source</label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No transactions match your filters</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((txn) => {
                  const isCredit = txn.transaction_type === "credit";
                  return (
                    <TableRow key={txn.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(txn.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(txn.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{formatLabel(txn.category)}</div>
                        {txn.description && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                            {txn.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right whitespace-nowrap">
                        {txn.points > 0 && (
                          <div className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                            {isCredit ? "+" : "-"}{txn.points.toLocaleString("en-IN")} pts
                          </div>
                        )}
                        {txn.amount > 0 && (
                          <div className={`text-[11px] ${isCredit ? "text-green-700" : "text-red-700"}`}>
                            {isCredit ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN")}
                          </div>
                        )}
                        {txn.rewards > 0 && (
                          <div className="text-[11px] text-purple-600">
                            {isCredit ? "+" : "-"}{txn.rewards} rewards
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={isCredit ? "default" : "secondary"}
                          className={`text-[10px] gap-1 ${
                            isCredit
                              ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {isCredit ? "Credited" : "Debited"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
