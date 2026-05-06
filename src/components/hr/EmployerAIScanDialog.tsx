import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ScanSearch, Briefcase, Send, MapPin, CheckCircle2, Mail, BellRing } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface JobLite {
  id: string;
  job_title: string;
  location: string | null;
  status: string | null;
  preferred_role?: string | null;
  experience_required?: string | null;
  skills?: string[] | null;
  category?: string | null;
}
interface CandidateLite {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  preferred_role: string | null;
  experience_level: string | null;
  primary_subject: string | null;
  location: string | null;
  category?: string | null;
  registration_number?: string | null;
}
interface Scored extends CandidateLite { score: number; reasons: string[]; }

const norm = (s?: string | null) => (s || "").toLowerCase().trim();

const scoreCandidate = (c: CandidateLite, job: JobLite): Scored => {
  let score = 0; const reasons: string[] = [];
  const jt = norm(job.job_title);
  const cr = norm(c.preferred_role);
  if (jt && cr && (jt.includes(cr) || cr.includes(jt))) { score += 50; reasons.push("Role match"); }
  if (job.location && c.location && norm(c.location).includes(norm(job.location).split(",")[0])) { score += 20; reasons.push("Location"); }
  if (c.primary_subject && jt.includes(norm(c.primary_subject))) { score += 15; reasons.push("Subject"); }
  if (job.experience_required && c.experience_level && norm(c.experience_level) === norm(job.experience_required)) { score += 15; reasons.push("Experience"); }
  if (job.category && c.category && norm(job.category) === norm(c.category)) { score += 10; reasons.push("Sector"); }
  return { ...c, score, reasons };
};

interface Props {
  open: boolean;
  onClose: () => void;
  employerId: string;
  employerName: string;
  employerEmail: string;
  hrUserId: string;
}

const EmployerAIScanDialog = ({ open, onClose, employerId, employerName, employerEmail, hrUserId }: Props) => {
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobLite | null>(null);
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState<Scored[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !employerId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("jobs")
        .select("id, job_title, location, status, experience_required, skills, category")
        .eq("employer_id", employerId)
        .order("created_at", { ascending: false });
      setJobs(((data as any[]) || []) as JobLite[]);
      setLoading(false);
      setSelectedJob(null);
      setMatches([]);
      setSelectedIds(new Set());
    })();
  }, [open, employerId]);

  const runScan = async (job: JobLite) => {
    setSelectedJob(job);
    setScanning(true);
    setMatches([]);
    setSelectedIds(new Set());
    try {
      const { data: cands } = await supabase
        .from("profiles")
        .select("id, full_name, email, mobile, preferred_role, experience_level, primary_subject, location, category, registration_number")
        .eq("role", "candidate")
        .limit(1000);
      const list = (cands as CandidateLite[]) || [];
      const scored = list
        .map(c => scoreCandidate(c, job))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);
      setMatches(scored);
      // Auto-select top 10
      setSelectedIds(new Set(scored.slice(0, 10).map(c => c.id)));
      toast.success(`Found ${scored.length} matches`);
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const sendToEmployer = async () => {
    if (!selectedJob || selectedIds.size === 0) {
      toast.error("Select at least one candidate");
      return;
    }
    setSending(true);
    try {
      const ids = Array.from(selectedIds);
      const chosen = matches.filter(m => ids.includes(m.id));

      // 1. Create transfer rows (so employer's Suggested Candidates panel shows them)
      const transferRows = ids.map(cid => ({
        candidate_id: cid,
        employer_id: employerId,
        hr_user_id: hrUserId,
        note: `AI scan match for "${selectedJob.job_title}"`,
      }));
      // Use upsert via insert with onConflict-ignore semantics
      for (const row of transferRows) {
        await supabase.from("hr_candidate_transfers").insert(row).then(() => {}, () => {});
      }

      // 2. Portal alert (employer_notifications)
      await supabase.from("employer_notifications").insert({
        employer_id: employerId,
        title: `${chosen.length} suggested candidate${chosen.length === 1 ? "" : "s"} for ${selectedJob.job_title}`,
        message: `HR has shared ${chosen.length} AI-matched candidate${chosen.length === 1 ? "" : "s"} for your vacancy "${selectedJob.job_title}". Open Suggested Candidates to review.`,
        type: "candidate_suggestion",
        job_title: selectedJob.job_title,
        recipient_email: employerEmail || null,
      });

      // 3. Email employer with the list
      if (employerEmail) {
        const rows = chosen.map(c =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.full_name || "Candidate"}</td>
           <td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.preferred_role || c.primary_subject || "—"}</td>
           <td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.location || "—"}</td>
           <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;"><strong>${Math.min(100, c.score)}%</strong></td></tr>`
        ).join("");
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#111;">
            <h2 style="color:#1e3a8a;margin:0 0 8px;">New AI-Matched Candidates for ${selectedJob.job_title}</h2>
            <p>Hi ${employerName},</p>
            <p>Our HR team ran an AI scan on your vacancy <strong>${selectedJob.job_title}</strong>${selectedJob.location ? ` (${selectedJob.location})` : ""} and shortlisted <strong>${chosen.length}</strong> candidate${chosen.length === 1 ? "" : "s"} for your review.</p>
            <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;">
              <thead><tr style="background:#f4f4f5;"><th align="left" style="padding:6px 8px;">Candidate</th><th align="left" style="padding:6px 8px;">Role / Subject</th><th align="left" style="padding:6px 8px;">Location</th><th align="right" style="padding:6px 8px;">Match</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="text-align:center;margin:20px 0;">
              <a href="https://gradiaa.com/employer/suggested-candidates" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">View Suggested Candidates</a>
            </div>
            <p style="font-size:12px;color:#6b7280;">You'll also see a portal alert in your Employer dashboard.</p>
          </div>`;
        try {
          await supabase.functions.invoke("send-resume-invite-email", {
            body: {
              to: employerEmail,
              subject: `${chosen.length} AI-matched candidate${chosen.length === 1 ? "" : "s"} for ${selectedJob.job_title}`,
              html,
              fromName: "Gradia HR",
              candidateName: employerName,
            },
          });
        } catch (e) { console.warn("Email send failed (non-blocking)", e); }
      }

      toast.success(`Sent ${chosen.length} candidates to ${employerName}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const totalSelected = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-primary" />
            AI Scan — {employerName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pick a vacancy, run the AI scan, then send matched candidates to the employer (portal alert + email).
          </DialogDescription>
        </DialogHeader>

        {!selectedJob ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Vacancies posted by {employerName} ({jobs.length})</p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vacancies posted yet.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {jobs.map(j => (
                  <div key={j.id} className="border rounded-md p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />{j.job_title}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        {j.location && (<><MapPin className="h-3 w-3" />{j.location}</>)}
                        <Badge variant="outline" className="text-[10px]">{j.status || "draft"}</Badge>
                      </p>
                    </div>
                    <Button size="sm" onClick={() => runScan(j)}>
                      <ScanSearch className="h-3.5 w-3.5 mr-1" /> AI Scan
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Card className="p-3 bg-muted/40">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm">
                  <span className="text-muted-foreground">Scanning:</span>{" "}
                  <span className="font-medium">{selectedJob.job_title}</span>
                  {selectedJob.location && <span className="text-muted-foreground"> · {selectedJob.location}</span>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setSelectedJob(null); setMatches([]); }}>
                  ← Back to vacancies
                </Button>
              </div>
            </Card>

            {scanning ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Running AI scan…</p>
              </div>
            ) : matches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No matched candidates found.</p>
            ) : (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-medium">{matches.length} matches found · {totalSelected} selected</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set(matches.map(m => m.id)))}>Select All</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto">
                  {matches.map(c => {
                    const checked = selectedIds.has(c.id);
                    return (
                      <div key={c.id} className={`border rounded-md p-2.5 flex items-center gap-3 ${checked ? "border-primary/50 bg-primary/5" : ""}`}>
                        <Checkbox checked={checked} onCheckedChange={() => toggle(c.id)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.full_name || "Candidate"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.preferred_role || c.primary_subject || "—"} · {c.location || "—"} · {c.email || "—"}
                          </p>
                          {c.reasons.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {c.reasons.join(" • ")}
                            </p>
                          )}
                        </div>
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          {Math.min(100, c.score)}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <BellRing className="h-3 w-3" /> Sends portal alert &
                    <Mail className="h-3 w-3" /> email to {employerEmail || "employer"}
                  </p>
                  <Button onClick={sendToEmployer} disabled={sending || totalSelected === 0}>
                    {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                    Send {totalSelected} to {employerName}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmployerAIScanDialog;
