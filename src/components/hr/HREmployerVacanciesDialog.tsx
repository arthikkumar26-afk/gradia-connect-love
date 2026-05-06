import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase, MapPin, Users, CheckCircle2, XCircle, Clock, ArrowLeft, Loader2, Calendar, TrendingUp,
} from "lucide-react";

interface JobRow {
  id: string;
  job_title: string;
  location: string | null;
  status: string | null;
  created_at: string | null;
  closing_date: string | null;
  experience_required: string | null;
}

interface CandidateAggRow {
  id: string;
  candidate_id: string;
  status: string | null;
  ai_score: number | null;
  applied_at: string | null;
  current_stage_id: string | null;
  candidate?: { full_name: string | null; email: string | null; mobile: string | null; preferred_role: string | null; location: string | null };
  events?: { status: string | null; stage?: { name: string | null } | null }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  employerId: string;
  employerName: string;
}

const HREmployerVacanciesDialog = ({ open, onClose, employerId, employerName }: Props) => {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [rows, setRows] = useState<CandidateAggRow[]>([]);

  useEffect(() => {
    if (!open || !employerId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("jobs")
        .select("id, job_title, location, status, created_at, closing_date, experience_required")
        .eq("employer_id", employerId)
        .order("created_at", { ascending: false });
      setJobs(((data as any[]) || []) as JobRow[]);
      setLoading(false);
      setSelectedJob(null);
      setRows([]);
    })();
  }, [open, employerId]);

  const openJob = async (job: JobRow) => {
    setSelectedJob(job);
    setJobLoading(true);
    setRows([]);
    try {
      const { data: ic } = await supabase
        .from("interview_candidates")
        .select(`
          id, candidate_id, status, ai_score, applied_at, current_stage_id,
          candidate:profiles!interview_candidates_candidate_id_fkey(full_name, email, mobile, preferred_role, location),
          events:interview_events(status, stage:interview_stages(name))
        `)
        .eq("job_id", job.id)
        .order("applied_at", { ascending: false });
      setRows(((ic as any[]) || []) as CandidateAggRow[]);
    } finally {
      setJobLoading(false);
    }
  };

  const summary = (() => {
    const total = rows.length;
    const hired = rows.filter(r => r.status === "hired").length;
    const rejected = rows.filter(r => r.status === "rejected").length;
    const withdrawn = rows.filter(r => r.status === "withdrawn").length;
    const inProgress = rows.filter(r => r.status === "active" || !r.status).length;
    // Attended = candidate has at least one completed/passed/failed event
    const attended = rows.filter(r =>
      (r.events || []).some(e => ["completed", "passed", "failed", "in_progress"].includes(e.status || ""))
    ).length;
    const avgScore = rows.length
      ? Math.round(rows.reduce((s, r) => s + (Number(r.ai_score) || 0), 0) / rows.length)
      : 0;
    return { total, hired, rejected, withdrawn, inProgress, attended, avgScore };
  })();

  const statusBadge = (s: string | null) => {
    switch (s) {
      case "hired": return <Badge className="bg-emerald-600 text-white text-[10px]">Selected</Badge>;
      case "rejected": return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
      case "withdrawn": return <Badge variant="outline" className="text-[10px]">Withdrawn</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">In Progress</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-5 w-5 text-primary" />
            {selectedJob ? selectedJob.job_title : `${employerName} — Vacancies`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {selectedJob
              ? "Candidate progress, attendance and selection breakdown"
              : `Click a vacancy to view candidate-level interview details`}
          </DialogDescription>
        </DialogHeader>

        {!selectedJob ? (
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No vacancies posted by this employer yet.</p>
            ) : (
              <div className="grid gap-2">
                {jobs.map(j => (
                  <Card key={j.id} className="p-3 flex items-center justify-between gap-3 flex-wrap hover:bg-muted/40 cursor-pointer transition" onClick={() => openJob(j)}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />{j.job_title}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        {j.location && (<><MapPin className="h-3 w-3" />{j.location}</>)}
                        {j.experience_required && <span>· {j.experience_required}</span>}
                        {j.created_at && <span>· {new Date(j.created_at).toLocaleDateString()}</span>}
                      </p>
                    </div>
                    <Badge variant={j.status === "active" ? "default" : "outline"} className="text-[10px] capitalize">{j.status || "draft"}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedJob(null); setRows([]); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to vacancies
            </Button>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <Stat label="Applied" value={summary.total} icon={<Users className="h-3.5 w-3.5" />} />
              <Stat label="Attended" value={summary.attended} icon={<Calendar className="h-3.5 w-3.5" />} tone="info" />
              <Stat label="In Progress" value={summary.inProgress} icon={<Clock className="h-3.5 w-3.5" />} tone="warn" />
              <Stat label="Selected" value={summary.hired} icon={<CheckCircle2 className="h-3.5 w-3.5" />} tone="success" />
              <Stat label="Rejected" value={summary.rejected} icon={<XCircle className="h-3.5 w-3.5" />} tone="danger" />
              <Stat label="Withdrawn" value={summary.withdrawn} icon={<XCircle className="h-3.5 w-3.5" />} />
              <Stat label="Avg Score" value={`${summary.avgScore}%`} icon={<TrendingUp className="h-3.5 w-3.5" />} tone="info" />
            </div>

            {jobLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No applications for this vacancy yet.</p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Candidate</th>
                      <th className="text-left px-3 py-2 font-medium">Contact</th>
                      <th className="text-left px-3 py-2 font-medium">Stages Attended</th>
                      <th className="text-right px-3 py-2 font-medium">Score</th>
                      <th className="text-left px-3 py-2 font-medium">Applied</th>
                      <th className="text-right px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const attended = (r.events || []).filter(e => ["completed", "passed", "failed", "in_progress"].includes(e.status || ""));
                      return (
                        <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <p className="font-medium">{r.candidate?.full_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{r.candidate?.preferred_role || "—"} · {r.candidate?.location || "—"}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-[11px]">{r.candidate?.email || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{r.candidate?.mobile || "—"}</p>
                          </td>
                          <td className="px-3 py-2">
                            {attended.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {attended.slice(0, 4).map((e, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] capitalize">
                                    {e.stage?.name || "stage"} · {e.status}
                                  </Badge>
                                ))}
                                {attended.length > 4 && (
                                  <span className="text-[10px] text-muted-foreground">+{attended.length - 4}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {r.ai_score != null ? `${Math.round(Number(r.ai_score))}%` : "—"}
                          </td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">
                            {r.applied_at ? new Date(r.applied_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">{statusBadge(r.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value, icon, tone }: { label: string; value: number | string; icon: React.ReactNode; tone?: "success" | "danger" | "warn" | "info" }) => {
  const toneClass =
    tone === "success" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
    : tone === "danger" ? "text-destructive bg-destructive/10"
    : tone === "warn" ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
    : tone === "info" ? "text-primary bg-primary/10"
    : "text-foreground bg-muted/40";
  return (
    <Card className={`p-2 ${toneClass} border-0`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-80">
        {icon}{label}
      </div>
      <p className="text-lg font-bold leading-tight mt-0.5">{value}</p>
    </Card>
  );
};

export default HREmployerVacanciesDialog;
