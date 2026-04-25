import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Search, Webhook } from "lucide-react";
import { format } from "date-fns";

interface LogRow {
  id: string;
  created_at: string;
  source: string;
  event_type: string | null;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  webhook_event_id: string | null;
  amount_paise: number | null;
  currency: string | null;
  user_id: string | null;
  related_table: string | null;
  related_id: string | null;
  http_status: number | null;
  signature_valid: boolean | null;
  error_message: string | null;
  request_headers: any;
  request_body: any;
  response_body: any;
  metadata: any;
}

const STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  failure: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  error:   "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  info:    "bg-muted text-muted-foreground border-border",
};

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "webhook", label: "Webhook" },
  { value: "create-order", label: "Order created" },
  { value: "verify-payment", label: "Verify payment" },
  { value: "verify-action-payment", label: "Verify action" },
  { value: "verify-candidate-payment", label: "Verify candidate" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "failure", label: "Failure" },
  { value: "error", label: "Error" },
  { value: "info", label: "Info" },
];

const fmtAmount = (paise: number | null, currency: string | null) => {
  if (paise == null) return "—";
  const value = (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `${currency || "INR"} ${value}`;
};

export default function RazorpayWebhooks() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LogRow | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const ok = (data || []).some((r: any) => r.role === "admin" || r.role === "owner");
      setAllowed(ok);
      setAuthChecked(true);
      if (!ok) navigate("/admin/dashboard");
    })();
  }, [navigate]);

  const fetchRows = async () => {
    setLoading(true);
    let q = supabase
      .from("razorpay_webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (source !== "all") q = q.eq("source", source);
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) console.error("fetch logs", error);
    setRows((data || []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => { if (allowed) fetchRows(); /* eslint-disable-next-line */ }, [allowed, source, status]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.razorpay_order_id, r.razorpay_payment_id, r.event_type, r.user_id, r.error_message, r.webhook_event_id]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, search]);

  const counters = useMemo(() => {
    const init = { success: 0, failure: 0, error: 0, info: 0, total: rows.length };
    rows.forEach(r => { (init as any)[r.status] = ((init as any)[r.status] || 0) + 1; });
    return init;
  }, [rows]);

  if (!authChecked) {
    return <div className="p-6"><Skeleton className="h-12 w-64 mb-4" /><Skeleton className="h-96 w-full" /></div>;
  }
  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Razorpay Webhook Logs</h1>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: counters.total, tone: "text-foreground" },
            { label: "Success", value: counters.success, tone: "text-emerald-600 dark:text-emerald-400" },
            { label: "Failure", value: counters.failure, tone: "text-red-600 dark:text-red-400" },
            { label: "Error", value: counters.error, tone: "text-amber-600 dark:text-amber-400" },
            { label: "Info", value: counters.info, tone: "text-muted-foreground" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="py-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={`text-2xl font-bold ${s.tone}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent events</CardTitle>
            <div className="flex flex-col md:flex-row gap-2 pt-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by order id, payment id, event, user…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order / Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Sig</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      No webhook events match your filters.
                    </TableCell></TableRow>
                  ) : filtered.map(row => (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(row)}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(row.created_at), "dd MMM HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-xs"><Badge variant="outline">{row.source}</Badge></TableCell>
                      <TableCell className="text-xs">{row.event_type || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[row.status] || ""}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="truncate max-w-[180px]">{row.razorpay_order_id || "—"}</div>
                        <div className="truncate max-w-[180px] text-muted-foreground">{row.razorpay_payment_id || "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmtAmount(row.amount_paise, row.currency)}</TableCell>
                      <TableCell className="text-xs">
                        {row.signature_valid === true ? (
                          <span className="text-emerald-600">valid</span>
                        ) : row.signature_valid === false ? (
                          <span className="text-red-600">invalid</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-red-600 max-w-[220px] truncate">{row.error_message || ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Showing {filtered.length} of {rows.length} (capped at 500 most recent).
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Event details
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Time" value={format(new Date(selected.created_at), "dd MMM yyyy HH:mm:ss")} />
                <Field label="Source" value={selected.source} />
                <Field label="Event" value={selected.event_type || "—"} />
                <Field label="Status" value={selected.status} />
                <Field label="HTTP" value={selected.http_status?.toString() || "—"} />
                <Field label="Signature valid" value={String(selected.signature_valid ?? "—")} />
                <Field label="Order ID" mono value={selected.razorpay_order_id || "—"} />
                <Field label="Payment ID" mono value={selected.razorpay_payment_id || "—"} />
                <Field label="Webhook event ID" mono value={selected.webhook_event_id || "—"} />
                <Field label="Amount" value={fmtAmount(selected.amount_paise, selected.currency)} />
                <Field label="User ID" mono value={selected.user_id || "—"} />
                <Field label="Related" value={selected.related_table ? `${selected.related_table} / ${selected.related_id || "—"}` : "—"} />
              </div>
              {selected.error_message && (
                <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                  {selected.error_message}
                </div>
              )}
              <JsonBlock title="Request body" data={selected.request_body} />
              <JsonBlock title="Response body" data={selected.response_body} />
              <JsonBlock title="Request headers" data={selected.request_headers} />
              <JsonBlock title="Metadata" data={selected.metadata} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm break-all ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function JsonBlock({ title, data }: { title: string; data: any }) {
  const empty = !data || (typeof data === "object" && Object.keys(data).length === 0);
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <pre className="text-xs bg-muted/50 border border-border rounded p-3 overflow-x-auto max-h-60">
{empty ? "—" : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
