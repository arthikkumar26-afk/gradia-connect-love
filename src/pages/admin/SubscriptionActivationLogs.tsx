import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

interface ActivationLog {
  id: string;
  created_at: string;
  candidate_id: string | null;
  plan: string | null;
  source: string;
  payment_id: string | null;
  order_id: string | null;
  amount_paise: number | null;
  currency: string | null;
  activation_result: string;
  error_message: string | null;
  webhook_event_id: string | null;
  payload_summary: any;
  subscription_id: string | null;
}

const resultBadge = (result: string) => {
  const variant = result === "success"
    ? "default"
    : result === "skipped"
    ? "secondary"
    : "destructive";
  return <Badge variant={variant as any}>{result}</Badge>;
};

const formatAmount = (paise: number | null, currency: string | null) =>
  paise == null ? "—" : `${(paise / 100).toFixed(2)} ${currency || "INR"}`;

export default function SubscriptionActivationLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ActivationLog | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_activation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error) setLogs((data || []) as ActivationLog[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (resultFilter !== "all" && l.activation_result !== resultFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [l.payment_id, l.order_id, l.candidate_id, l.plan, l.error_message]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, resultFilter, sourceFilter]);

  const stats = useMemo(() => ({
    total: logs.length,
    success: logs.filter((l) => l.activation_result === "success").length,
    failed: logs.filter((l) => l.activation_result === "failed").length,
    skipped: logs.filter((l) => l.activation_result === "skipped").length,
  }), [logs]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              Subscription Activation Audit
            </h1>
            <p className="text-sm text-muted-foreground">
              Every plan activation attempt with payment ID, payload summary, and result
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Success", value: stats.success },
          { label: "Failed", value: stats.failed },
          { label: "Skipped", value: stats.skipped },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activation Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payment_id, order_id, candidate_id, plan…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="verify">Verify endpoint</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Candidate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No activation logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(l)}
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(l.created_at), "dd MMM yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>{resultBadge(l.activation_result)}</TableCell>
                      <TableCell>{l.plan || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{l.payment_id || "—"}</TableCell>
                      <TableCell>{formatAmount(l.amount_paise, l.currency)}</TableCell>
                      <TableCell><Badge variant="outline">{l.source}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">
                        {l.candidate_id ? l.candidate_id.slice(0, 8) + "…" : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Activation Log Details</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Result" value={resultBadge(selected.activation_result)} />
                <Field label="Source" value={<Badge variant="outline">{selected.source}</Badge>} />
                <Field label="Plan" value={selected.plan || "—"} />
                <Field label="Amount" value={formatAmount(selected.amount_paise, selected.currency)} />
                <Field label="Time" value={format(new Date(selected.created_at), "PPpp")} />
                <Field label="Webhook Event ID" value={selected.webhook_event_id || "—"} mono />
              </div>
              <Field label="Payment ID" value={selected.payment_id || "—"} mono />
              <Field label="Order ID" value={selected.order_id || "—"} mono />
              <Field label="Candidate ID" value={selected.candidate_id || "—"} mono />
              <Field label="Subscription ID" value={selected.subscription_id || "—"} mono />
              {selected.error_message && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Error</p>
                  <pre className="bg-destructive/10 text-destructive p-3 rounded text-xs whitespace-pre-wrap">
                    {selected.error_message}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Payload Summary</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(selected.payload_summary || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={mono ? "font-mono text-xs break-all" : ""}>{value}</div>
    </div>
  );
}
