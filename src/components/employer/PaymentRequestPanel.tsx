import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { IndianRupee, Loader2, MoreVertical, RefreshCw, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PaymentMailComposer from "./PaymentMailComposer";

interface Props { candidateId: string; jobId?: string | null; jobTitle?: string | null }

const statusStyle: Record<string, string> = {
  paid: "bg-primary text-primary-foreground",
  failed: "bg-destructive text-destructive-foreground",
  sent: "bg-secondary text-secondary-foreground",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};
const statusLabel: Record<string, string> = { sent: "Awaiting payment", paid: "Paid", failed: "Failed", expired: "Expired", cancelled: "Cancelled" };
const manualOptions = [
  { status: "paid", label: "Mark as cleared (paid)" },
  { status: "cancelled", label: "Cancel request" },
  { status: "failed", label: "Mark as failed" },
  { status: "sent", label: "Reset to awaiting payment" },
];

export const PaymentRequestPanel = ({ candidateId, jobId, jobTitle }: Props) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("candidate-payment-request", { body: { action: "list", candidateId } });
    setRequests(data?.requests || []);
    setLoading(false);
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  const send = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1 || value > 500000) { toast({ title: "Enter an amount between ₹1 and ₹5,00,000", variant: "destructive" }); return; }
    setComposerOpen(true);
  };

  const setStatus = async (requestId: string, status: string) => {
    if (status === "cancelled" && !window.confirm("Cancel this payment request? The candidate's payment link and QR will stop working.")) return;
    setUpdating(requestId);
    const { data, error } = await supabase.functions.invoke("candidate-payment-request", { body: { action: "set_status", requestId, status } });
    setUpdating(null);
    if (error || !data?.ok) { toast({ title: "Could not update status", description: data?.error || error?.message, variant: "destructive" }); return; }
    toast({ title: `Status changed to ${statusLabel[status]}` });
    load();
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4" /> Payment request</h4>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} aria-label="Refresh payment status" title="Refresh payment status">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap gap-2">
        <Input type="number" min={1} max={500000} step="0.01" aria-label="Payment amount" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 min-w-0" />
        <Button size="sm" onClick={send}>
          <Send className="h-3.5 w-3.5 mr-1" />
          Compose Payment Mail
        </Button>
      </div>
      <PaymentMailComposer open={composerOpen} onOpenChange={setComposerOpen} candidateId={candidateId} jobId={jobId} jobTitle={jobTitle} amount={Number(amount)} onSent={() => { setAmount(""); void load(); }} />
      {requests.length > 0 && (
        <div className="space-y-1.5">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs border rounded-md px-2 py-1.5">
              <div>
                <span className="font-semibold">₹{(r.amount_paise / 100).toLocaleString("en-IN")}</span>
                {r.job_title && <span className="text-muted-foreground"> · {r.job_title}</span>}
                <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-1">
                <Badge className={statusStyle[r.status] || ""}>
                  {r.status === "paid" && r.manually_updated ? "Cleared" : statusLabel[r.status] || r.status}
                  {r.manually_updated && r.status !== "paid" ? " (manual)" : ""}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={updating === r.id} aria-label="Change status">
                      {updating === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[1600]">
                    <DropdownMenuLabel className="text-xs">Change status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {manualOptions.filter((o) => o.status !== r.status).map((o) => (
                      <DropdownMenuItem key={o.status} onClick={() => setStatus(r.id, o.status)}>{o.label}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentRequestPanel;
