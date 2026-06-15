import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw, CreditCard, Receipt, Video } from "lucide-react";

interface MockTxn {
  id: string;
  amount_inr: number;
  status: string;
  created_at: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
}

interface Props {
  userId: string;
}

interface StatusData {
  subscription: {
    active: boolean;
    current: {
      plan: string;
      status: string;
      started_at: string | null;
      ends_at: string | null;
    } | null;
  };
  latest_order: {
    order_id: string;
    amount_paise: number;
    currency: string;
    created_at: string;
    plan: string | null;
  } | null;
  latest_payment: {
    payment_id: string;
    status: string;
    amount_paise: number;
    currency: string;
    method: string | null;
    error_code: string | null;
    error_description: string | null;
    created_at: string | null;
  } | null;
  activation?: {
    activated?: boolean;
    source?: string;
    error?: string;
  } | null;
}

const formatINR = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
};

export default function PaymentStatusPanel({ userId }: Props) {
  const [data, setData] = useState<StatusData | null>(null);
  const [mockTxns, setMockTxns] = useState<MockTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [statusRes, txnRes] = await Promise.all([
        supabase.functions.invoke("get-candidate-payment-status"),
        supabase
          .from("payment_transactions")
          .select("id, amount_inr, status, created_at, razorpay_payment_id, razorpay_order_id")
          .eq("user_id", userId)
          .eq("action_key", "extra_mock_test")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (statusRes.error) throw statusRes.error;
      setData(statusRes.data as StatusData);
      if (!txnRes.error && txnRes.data) setMockTxns(txnRes.data as MockTxn[]);
    } catch (e) {
      console.error("[PaymentStatusPanel] load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const sub = data?.subscription?.current;
  const subActive = !!data?.subscription?.active;
  const order = data?.latest_order;
  const pay = data?.latest_payment;

  const paymentBadge = () => {
    if (!pay) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" /> No payment attempts
        </Badge>
      );
    }
    if (pay.status === "captured" || pay.status === "authorized") {
      return (
        <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
          <CheckCircle2 className="h-3 w-3" /> Success ({pay.status})
        </Badge>
      );
    }
    if (pay.status === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertCircle className="h-3 w-3" /> {pay.status}
      </Badge>
    );
  };

  const subBadge = () => {
    if (!sub) return <Badge variant="outline">No subscription</Badge>;
    if (subActive) {
      return (
        <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
          <CheckCircle2 className="h-3 w-3" /> Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="capitalize gap-1">
        <AlertCircle className="h-3 w-3" /> {sub.status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Payment & Subscription Status
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={load}
          disabled={refreshing}
          className="h-8 gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Subscription card */}
            <div className="rounded-lg border border-border p-3 bg-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Current Plan
                </p>
                {subBadge()}
              </div>
              {sub ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium capitalize">{sub.plan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize">{sub.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-medium">{formatDate(sub.started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ends</span>
                    <span className="font-medium">{formatDate(sub.ends_at)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No subscription on record.</p>
              )}
            </div>

            {/* Latest payment card */}
            <div className="rounded-lg border border-border p-3 bg-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> Latest Payment
                </p>
                {paymentBadge()}
              </div>
              {pay || order ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Payment ID</span>
                    <span className="font-mono text-[11px] truncate" title={pay?.payment_id || ""}>
                      {pay?.payment_id || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Order ID</span>
                    <span className="font-mono text-[11px] truncate" title={order?.order_id || ""}>
                      {order?.order_id || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">
                      {pay
                        ? formatINR(pay.amount_paise)
                        : order
                        ? formatINR(order.amount_paise)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium uppercase">{pay?.method || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attempted</span>
                    <span className="font-medium">
                      {formatDate(pay?.created_at || order?.created_at || null)}
                    </span>
                  </div>
                  {pay?.error_description && (
                    <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-[11px] leading-snug">
                      <span className="font-semibold">Reason:</span> {pay.error_description}
                      {pay.error_code && (
                        <span className="block opacity-80 mt-0.5">Code: {pay.error_code}</span>
                      )}
                    </div>
                  )}
                  {data?.activation?.activated && (
                    <div className="mt-2 p-2 rounded bg-primary/10 border border-primary/30 text-primary text-[11px] leading-snug">
                      Plan activated from the captured Razorpay payment.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No payment attempts yet. Subscribe to a plan to begin.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mock Interview Transaction History */}
        {!loading && (
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-primary" />
                Mock Interview Transactions
              </p>
              <Badge variant="secondary" className="text-[10px]">
                {mockTxns.filter((t) => t.status === "paid").length} unlocked
              </Badge>
            </div>
            {mockTxns.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                No extra mock interview purchases yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] h-8">Date</TableHead>
                      <TableHead className="text-[11px] h-8 text-right">Amount</TableHead>
                      <TableHead className="text-[11px] h-8 text-center">Unlocked</TableHead>
                      <TableHead className="text-[11px] h-8 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const paidOnly = mockTxns.filter((t) => t.status === "paid");
                      const totalPaid = paidOnly.length;
                      return mockTxns.map((t) => {
                        const paidIdx = paidOnly.findIndex((p) => p.id === t.id);
                        const cumulative = paidIdx >= 0 ? totalPaid - paidIdx : null;
                        const isPaid = t.status === "paid";
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-[11px] whitespace-nowrap">
                              {formatDate(t.created_at)}
                            </TableCell>
                            <TableCell className="text-[11px] text-right font-medium">
                              ₹{Number(t.amount_inr).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-[11px] text-center">
                              {cumulative ? (
                                <span className="font-semibold text-primary">+1 mock</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                              {cumulative && (
                                <div className="text-[10px] text-muted-foreground">
                                  Total: {cumulative}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={isPaid ? "default" : "secondary"}
                                className={`text-[10px] capitalize ${
                                  isPaid
                                    ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                                    : t.status === "failed"
                                    ? "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                                    : ""
                                }`}
                              >
                                {t.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Status is fetched live from Razorpay. If a payment shows "Success" but your plan still
          says inactive, click Refresh — activation is processed within a few seconds.
        </p>
      </CardContent>
    </Card>
  );
}
