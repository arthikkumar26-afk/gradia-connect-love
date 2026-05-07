import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Briefcase, Building, Calendar, CheckCircle2, ChevronRight, Clock,
  Globe, Loader2, Mail, MapPin, Phone, ScanSearch, Send, TrendingUp, Users, XCircle,
} from "lucide-react";
import EmployerAIScanDialog from "@/components/hr/EmployerAIScanDialog";
import TransferEmployerDialog from "@/components/hr/TransferEmployerDialog";
import { useAuth } from "@/contexts/AuthContext";

interface Employer {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  company_name: string | null;
  company_description: string | null;
  website: string | null;
  location: string | null;
  profile_picture: string | null;
  created_at: string | null;
}

interface Job {
  id: string;
  job_title: string;
  location: string | null;
  status: string | null;
  created_at: string | null;
  closing_date: string | null;
  experience_required: string | null;
  job_type: string | null;
  department: string | null;
  salary_range: string | null;
}

interface CandidateRow {
  id: string;
  candidate_id: string;
  status: string | null;
  ai_score: number | null;
  applied_at: string | null;
  current_stage_id: string | null;
  candidate?: { full_name: string | null; email: string | null; mobile: string | null; preferred_role: string | null; location: string | null };
  events?: { status: string | null; scheduled_at: string | null; completed_at: string | null; ai_score: number | null; stage?: { name: string | null; stage_order: number | null } | null }[];
  current_stage?: { name: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", scheduled: "Scheduled", in_progress: "In Progress",
  completed: "Completed", passed: "Passed", failed: "Failed",
};

const stageBadgeClass = (s: string | null) => {
  switch (s) {
    case "passed":
    case "completed": return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "failed": return "bg-destructive/10 text-destructive border-destructive/30";
    case "in_progress": return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400";
    case "scheduled": return "bg-primary/10 text-primary border-primary/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const HREmployerProfile = () => {
  const { employerId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [emp, setEmp] = useState<Employer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobStats, setJobStats] = useState<Record<string, { applied: number; finished: number }>>({});

  const [scanOpen, setScanOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, email, mobile, company_name, company_description, website, location, profile_picture, created_at")
        .eq("id", employerId)
        .maybeSingle();
      setEmp((p as any) || null);

      const { data: js } = await supabase
        .from("jobs")
        .select("id, job_title, location, status, created_at, closing_date, experience_required, job_type, department, salary_range")
        .eq("employer_id", employerId)
        .order("created_at", { ascending: false });
      const list = ((js as any[]) || []) as Job[];
      setJobs(list);

      // Aggregate per-job applied/finished counts
      if (list.length) {
        const ids = list.map(j => j.id);
        const { data: ic } = await supabase
          .from("interview_candidates")
          .select("id, job_id, status")
          .in("job_id", ids);
        const stats: Record<string, { applied: number; finished: number }> = {};
        ids.forEach(id => (stats[id] = { applied: 0, finished: 0 }));
        ((ic as any[]) || []).forEach(r => {
          stats[r.job_id].applied += 1;
          if (r.status === "hired" || r.status === "rejected") stats[r.job_id].finished += 1;
        });
        setJobStats(stats);
      }
      setLoading(false);
    })();
  }, [employerId]);

  const openJob = async (job: Job) => {
    setSelectedJob(job);
    setJobLoading(true);
    setRows([]);
    try {
      const { data: ic } = await supabase
        .from("interview_candidates")
        .select(`
          id, candidate_id, status, ai_score, applied_at, current_stage_id,
          candidate:profiles!interview_candidates_candidate_id_fkey(full_name, email, mobile, preferred_role, location),
          current_stage:interview_stages!interview_candidates_current_stage_id_fkey(name),
          events:interview_events(status, scheduled_at, completed_at, ai_score, stage:interview_stages(name, stage_order))
        `)
        .eq("job_id", job.id)
        .order("applied_at", { ascending: false });
      setRows(((ic as any[]) || []) as CandidateRow[]);
    } finally {
      setJobLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = rows.length;
    const hired = rows.filter(r => r.status === "hired").length;
    const rejected = rows.filter(r => r.status === "rejected").length;
    const withdrawn = rows.filter(r => r.status === "withdrawn").length;
    const inProgress = rows.filter(r => r.status === "active" || !r.status).length;
    const attended = rows.filter(r =>
      (r.events || []).some(e => ["completed", "passed", "failed", "in_progress"].includes(e.status || ""))
    ).length;
    const avgScore = rows.length
      ? Math.round(rows.reduce((s, r) => s + (Number(r.ai_score) || 0), 0) / rows.length)
      : 0;
    return { total, hired, rejected, withdrawn, inProgress, attended, avgScore };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Employer not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
      </div>
    );
  }

  const empName = emp.company_name || emp.full_name || "Employer";

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/hr/dashboard/employer")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Employers
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setScanOpen(true)}>
              <ScanSearch className="h-4 w-4 mr-1" /> AI Scan
            </Button>
            <Button size="sm" onClick={() => setTransferOpen(true)}>
              <Send className="h-4 w-4 mr-1" /> Transfer
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-5">
        {/* Profile header */}
        <Card>
          <CardContent className="p-5 flex items-start gap-4 flex-wrap">
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {emp.profile_picture
                ? <img src={emp.profile_picture} alt={empName} className="h-full w-full object-cover" />
                : <Building className="h-7 w-7 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{empName}</h1>
              {emp.company_description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{emp.company_description}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                {emp.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{emp.email}</span>}
                {emp.mobile && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{emp.mobile}</span>}
                {emp.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{emp.location}</span>}
                {emp.website && <a href={emp.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="h-3.5 w-3.5" />{emp.website}</a>}
                {emp.created_at && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {new Date(emp.created_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />{jobs.length} Vacancies</Badge>
              <Badge variant="outline" className="text-xs">
                {Object.values(jobStats).reduce((s, x) => s + x.applied, 0)} Total Applicants
              </Badge>
            </div>
          </CardContent>
        </Card>

        {!selectedJob ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vacancies ({jobs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No vacancies posted yet.</p>
              ) : (
                <div className="grid gap-2">
                  {jobs.map(j => {
                    const s = jobStats[j.id] || { applied: 0, finished: 0 };
                    return (
                      <div key={j.id}
                        className="border rounded-md p-3 flex items-center justify-between gap-3 flex-wrap hover:bg-muted/40 cursor-pointer transition"
                        onClick={() => openJob(j)}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-primary" />{j.job_title}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                            {j.department && <span>{j.department}</span>}
                            {j.location && (<><MapPin className="h-3 w-3" />{j.location}</>)}
                            {j.experience_required && <span>· {j.experience_required}</span>}
                            {j.job_type && <span>· {j.job_type}</span>}
                            {j.salary_range && <span>· {j.salary_range}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[11px]"><Users className="h-3 w-3 mr-1" />{s.applied} applicants</Badge>
                          <Badge variant="outline" className="text-[11px]">{s.finished} finished</Badge>
                          <Badge variant={j.status === "active" ? "default" : "outline"} className="text-[10px] capitalize">{j.status || "draft"}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />{selectedJob.job_title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Candidate progress, attendance and pipeline</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedJob(null); setRows([]); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Vacancies
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="space-y-3">
                  {rows.map(r => {
                    const events = (r.events || []).slice().sort((a, b) =>
                      (a.stage?.stage_order ?? 0) - (b.stage?.stage_order ?? 0)
                    );
                    return (
                      <div key={r.id} className="border rounded-md p-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{r.candidate?.full_name || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {r.candidate?.preferred_role || "—"} · {r.candidate?.location || "—"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {r.candidate?.email || "—"}{r.candidate?.mobile ? ` · ${r.candidate.mobile}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {r.current_stage?.name && (
                              <Badge variant="outline" className="text-[10px]">Current: {r.current_stage.name}</Badge>
                            )}
                            <Badge className="text-[10px]" variant="secondary">
                              Score: {r.ai_score != null ? `${Math.round(Number(r.ai_score))}%` : "—"}
                            </Badge>
                            <Badge className={`text-[10px] capitalize ${
                              r.status === "hired" ? "bg-emerald-600 text-white"
                              : r.status === "rejected" ? "bg-destructive text-destructive-foreground"
                              : "bg-primary/10 text-primary"
                            }`}>{r.status || "active"}</Badge>
                          </div>
                        </div>

                        {events.length > 0 && (
                          <div className="mt-3 border-t pt-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Pipeline</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {events.map((e, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <div className={`px-2 py-1 rounded border text-[10px] flex items-center gap-1 ${stageBadgeClass(e.status)}`}>
                                    <span className="font-medium">{e.stage?.name || "Stage"}</span>
                                    <span className="opacity-70">· {STATUS_LABEL[e.status || ""] || e.status || "—"}</span>
                                    {e.ai_score != null && <span className="opacity-70">· {Math.round(Number(e.ai_score))}%</span>}
                                  </div>
                                  {i < events.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {scanOpen && user && (
        <EmployerAIScanDialog
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          employerId={emp.id}
          employerName={empName}
          employerEmail={emp.email || ""}
          hrUserId={user.id}
        />
      )}
      {transferOpen && user && (
        <TransferEmployerDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          hrUserId={user.id}
          employerId={emp.id}
          employerName={empName}
        />
      )}
    </div>
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

export default HREmployerProfile;
