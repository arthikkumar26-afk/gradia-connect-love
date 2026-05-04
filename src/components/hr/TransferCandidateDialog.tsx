import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Search } from "lucide-react";

interface EmployerOption {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hrUserId: string;
  candidateId: string;
  candidateName: string;
  onTransferred?: () => void;
}

export default function TransferCandidateDialog({
  open,
  onOpenChange,
  hrUserId,
  candidateId,
  candidateName,
  onTransferred,
}: Props) {
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [search, setSearch] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPickedId(null);
    setNote("");
    setSearch("");
    supabase
      .from("profiles")
      .select("id, full_name, email, company_name")
      .eq("role", "employer")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          toast.error("Couldn't load employers");
        }
        setEmployers((data as EmployerOption[]) || []);
        setLoading(false);
      });
  }, [open]);

  const filtered = employers.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.company_name || "").toLowerCase().includes(q) ||
      (e.full_name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  });

  const submit = async () => {
    if (!pickedId) {
      toast.error("Pick an employer");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("hr_candidate_transfers").insert({
      hr_user_id: hrUserId,
      candidate_id: candidateId,
      employer_id: pickedId,
      note: note || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("This candidate is already transferred to that employer.");
      } else {
        console.error(error);
        toast.error(error.message || "Transfer failed");
      }
      return;
    }
    toast.success(`Transferred ${candidateName} to employer`);
    onOpenChange(false);
    onTransferred?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer candidate to employer</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Sharing <span className="font-medium text-foreground">{candidateName}</span> with the
          employer below. They'll see this candidate in their Candidates tab and the badge will
          credit you.
        </p>

        <div className="space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Search employers by name, company, email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="border rounded-md max-h-64 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground p-3">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">No employers found.</p>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setPickedId(e.id)}
                  className={`w-full flex items-center gap-3 p-2.5 text-left border-b last:border-b-0 hover:bg-muted ${
                    pickedId === e.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {e.company_name || e.full_name || "Employer"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{e.email || "—"}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this candidate a good fit?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !pickedId}>
            {submitting ? "Transferring…" : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
