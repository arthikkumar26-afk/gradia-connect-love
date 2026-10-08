import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { IndianRupee, Loader2, RefreshCw, Send } from "lucide-react";

interface Props { candidateId: string; jobId?: string | null; jobTitle?: string | null }

const statusStyle: Record<string, string> = {
  paid: "bg-primary text-primary-foreground",
  failed: "bg-destructive text-destructive-foreground",
  sent: "bg-secondary text-secondary-foreground",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};
const statusLabel: Record<string, string> = { sent: "Awaiting payment", paid: "Paid", failed: "Failed", expired: "Expired", cancelled: "Cancelled" };

export const PaymentRequestPanel = ({ candidateId, jobId, jobTitle }: Props) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("candidate-payment-request", { body: { action: "list", candidateId } });
    setRequests(data?.requests || []);
    setLoading(false);
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const value = Number(amount);
    if (!value || value < 1) { toast({ title: "Enter an amount of at least ₹1", variant: "destructive" }); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("candidate-payment-request", {
      body: { action: "send", candidateId, amount: value, jobId: jobId || null, jobTitle: jobTitle || null },
    });
    setSending(false);
    if (error || !data?.ok) {
      toast({ title: "Could not send payment mail", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: data.emailSent ? "Payment mail sent" : "Payment link created, but the email failed to send" });
    setAmount("");
    load();
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4" /> Payment request</h4>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="flex gap-2">
        <Input type="number" min={1} placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
        <Button size="sm" onClick={send} disabled={sending}>
          {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
          Send Payment Mail
        </Button>
      </div>
      {requests.length > 0 && (
        <div className="space-y-1.5">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs border rounded-md px-2 py-1.5">
              <div>
                <span className="font-semibold">₹{(r.amount_paise / 100).toLocaleString("en-IN")}</span>
                {r.job_title && <span className="text-muted-foreground"> · {r.job_title}</span>}
                <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <Badge className={statusStyle[r.status] || ""}>{statusLabel[r.status] || r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentRequestPanel;
