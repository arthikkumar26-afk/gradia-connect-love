import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Search } from "lucide-react";

interface CandidateOption {
  id: string;
  full_name: string | null;
  email: string | null;
  preferred_role: string | null;
}

interface JobOption {
  id: string;
  job_title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hrUserId: string;
  employerId: string;
  employerName: string;
  onTransferred?: () => void;
}

export default function TransferEmployerDialog({
  open,
  onOpenChange,
  hrUserId,
  employerId,
  employerName,
  onTransferred,
}: Props) {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [search, setSearch] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedJobId, setPickedJobId] = useState<string>("__all__");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPickedId(null);
    setPickedJobId("__all__");
    setNote("");
    setSearch("");
    Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, preferred_role")
        .eq("role", "candidate")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("jobs")
        .select("id, job_title")
        .eq("employer_id", employerId)
        .order("created_at", { ascending: false }),
    ]).then(([candRes, jobRes]) => {
      setCandidates((candRes.data as CandidateOption[]) || []);
      setJobs((jobRes.data as JobOption[]) || []);
      setLoading(false);
    });
  }, [open, employerId]);

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.preferred_role || "").toLowerCase().includes(q)
    );
  });

  const submit = async () => {
    if (!pickedId) {
      toast.error("Pick a candidate");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("hr_employer_transfers").insert({
      hr_user_id: hrUserId,
      employer_id: employerId,
      candidate_id: pickedId,
      job_id: pickedJobId === "__all__" ? null : pickedJobId,
      note: note || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("This employer/job is already transferred to that candidate.");
      } else {
        console.error(error);
        toast.error(error.message || "Transfer failed");
      }
      return;
    }
    toast.success(`Transferred ${employerName} to candidate`);
    onOpenChange(false);
    onTransferred?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer employer to candidate</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Sharing <span className="font-medium text-foreground">{employerName}</span> with the
          candidate below. They'll see this employer's jobs in their listings with your name as the
          referrer.
        </p>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Limit to a specific job (optional)</Label>
            <Select value={pickedJobId} onValueChange={setPickedJobId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All jobs of this employer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All jobs of this employer</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Search candidates by name, email, role"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="border rounded-md max-h-64 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground p-3">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">No candidates found.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPickedId(c.id)}
                  className={`w-full flex items-center gap-3 p-2.5 text-left border-b last:border-b-0 hover:bg-muted ${
                    pickedId === c.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.full_name || "Candidate"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.email || "—"} · {c.preferred_role || "—"}
                    </p>
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
              placeholder="Why is this employer a good fit?"
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
