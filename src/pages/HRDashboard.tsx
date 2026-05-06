import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Briefcase, Users, GitBranch, Calendar, LogOut, Building2, FileText, Plus, LayoutDashboard, Menu, X, Copy, Share2, FileSpreadsheet, Sparkles, ScanSearch, RefreshCw, UserSquare2, Mail, Building, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import gradiaLogo from "@/assets/gradia-logo.png";
import HRJobPostingWizard from "@/components/hr/HRJobPostingWizard";
import SampleCandidateDemo from "@/components/hr/SampleCandidateDemo";
import HRCandidateInfoSheet from "@/components/hr/HRCandidateInfoSheet";

import HRCVScrutiny from "@/components/hr/HRCVScrutiny";
import HRCandidatesData from "@/components/hr/HRCandidatesData";
import HRInviteCandidate from "@/components/hr/HRInviteCandidate";
import HRInviteEmployer from "@/components/hr/HRInviteEmployer";
import HRCandidateProfileDialog from "@/components/hr/HRCandidateProfileDialog";
import HREmailStatus from "@/components/hr/HREmailStatus";
import TransferCandidateDialog from "@/components/hr/TransferCandidateDialog";
import TransferEmployerDialog from "@/components/hr/TransferEmployerDialog";
import { Send } from "lucide-react";

interface JobRow {
  id: string;
  job_title: string;
  location: string | null;
  status: string | null;
  created_at: string;
}
interface CandidateRow {
  id: string;
  candidate_id: string;
  job_id: string;
  current_stage: string | null;
  status: string | null;
  applied_at: string | null;
  ai_score: number | null;
  candidate_name?: string;
  candidate_email?: string | null;
  job_title?: string;
  mobile?: string | null;
  registration_number?: string | null;
  category?: string | null;
  segment?: string | null;
  preferred_state?: string | null;
  preferred_district?: string | null;
  location?: string | null;
  primary_subject?: string | null;
  preferred_role?: string | null;
}
interface EmployerRow {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name?: string | null;
  phone?: string | null;
  created_at?: string | null;
}
interface AllCandidateRow {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile?: string | null;
  preferred_role?: string | null;
  experience_level?: string | null;
  highest_qualification?: string | null;
  location?: string | null;
  current_state?: string | null;
  current_district?: string | null;
  resume_url?: string | null;
  registration_number?: string | null;
  created_at?: string | null;
  category?: string | null;
  segment?: string | null;
  preferred_state?: string | null;
  preferred_district?: string | null;
  primary_subject?: string | null;
}

interface HRDashboardProps {
  view?: "employer" | "candidate" | "all";
}

const HRDashboard = ({ view = "all" }: HRDashboardProps) => {
  const { user, profile, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [parentEmployerId, setParentEmployerId] = useState<string | null>(null);
  const [parentEmployerName, setParentEmployerName] = useState<string>("");
  const [parentEmployerEmail, setParentEmployerEmail] = useState<string>("");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [employers, setEmployers] = useState<EmployerRow[]>([]);
  const [allCandidates, setAllCandidates] = useState<AllCandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState(view === "candidate" ? "candidates" : "overview");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [transferCandidate, setTransferCandidate] = useState<{ id: string; name: string } | null>(null);
  const [transferEmployer, setTransferEmployer] = useState<{ id: string; name: string } | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");

  const reloadJobs = useCallback(async (employerId: string) => {
    const { data: jobsData, error } = await supabase
      .from("jobs")
      .select("id, job_title, location, status, created_at")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    setJobs((jobsData as JobRow[]) ?? []);
  }, []);

  const loadDashboardData = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return;
    if (!options?.silent) setLoading(true);
    try {
      const isManager = (profile?.role as string) === "hr_manager";

      let employerIdsForJobs: string[] = [];

      if (isManager) {
        // HR Manager: full access — pull all employers' jobs
        const { data: empProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, company_name, email")
          .eq("role", "employer");
        employerIdsForJobs = (empProfiles ?? []).map((p: any) => p.id);
        setParentEmployerId(null);
        setParentEmployerName(`HR Manager — ${empProfiles?.length ?? 0} Employers`);
        setParentEmployerEmail("");
      } else {
        const { data: link, error: linkError } = await supabase
          .from("hr_employer_links")
          .select("employer_user_id, is_active, updated_at")
          .eq("hr_user_id", user.id)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (linkError) throw linkError;

        if (!link) {
          toast.error("Your HR account is not linked to any Employer yet. Contact your Employer admin.");
          setParentEmployerId(null);
          setParentEmployerName("");
          setParentEmployerEmail("");
          setJobs([]);
          setCandidates([]);
          return;
        }

        setParentEmployerId(link.employer_user_id);
        const { data: empProfile, error: empError } = await supabase
          .from("profiles")
          .select("full_name, company_name, email")
          .eq("id", link.employer_user_id)
          .maybeSingle();
        if (empError) throw empError;
        setParentEmployerName(empProfile?.company_name || empProfile?.full_name || "Linked Employer");
        setParentEmployerEmail(empProfile?.email || "");
        employerIdsForJobs = [link.employer_user_id];
      }

      let jobsQuery = supabase
        .from("jobs")
        .select("id, job_title, location, status, created_at")
        .order("created_at", { ascending: false });
      if (!isManager) jobsQuery = jobsQuery.eq("employer_id", employerIdsForJobs[0]);
      const { data: jobsData, error: jobsError } = await jobsQuery;
      if (jobsError) throw jobsError;

      setJobs((jobsData as JobRow[]) ?? []);

      const jobIds = (jobsData ?? []).map((j: any) => j.id);
      if (jobIds.length) {
        const { data: cands, error: candsError } = await supabase
          .from("interview_candidates")
          .select("id, candidate_id, job_id, current_stage:interview_stages!interview_candidates_current_stage_id_fkey(name), status, applied_at, ai_score")
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false })
          .limit(200);
        if (candsError) throw candsError;

        const candIds = Array.from(new Set((cands ?? []).map((c: any) => c.candidate_id)));
        const { data: profs, error: profsError } = candIds.length
          ? await supabase.from("profiles").select("id, full_name, email, mobile, registration_number, category, segment, preferred_state, preferred_district, location, primary_subject, preferred_role").in("id", candIds)
          : { data: [] as any[], error: null };
        if (profsError) throw profsError;

        const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
        const titleMap = Object.fromEntries((jobsData ?? []).map((j: any) => [j.id, j.job_title]));
        setCandidates(
          (cands ?? []).map((c: any) => {
            const p = profMap[c.candidate_id] || {};
            return {
              ...c,
              current_stage: c.current_stage?.name || null,
              candidate_name: p.full_name || "Candidate",
              candidate_email: p.email || null,
              job_title: titleMap[c.job_id] || "—",
              mobile: p.mobile,
              registration_number: p.registration_number,
              category: p.category,
              segment: p.segment,
              preferred_state: p.preferred_state,
              preferred_district: p.preferred_district,
              location: p.location,
              primary_subject: p.primary_subject,
              preferred_role: p.preferred_role,
            };
          })
        );
      } else {
        setCandidates([]);
      }

      // HR Manager: load all employers + all candidates for the new tabs
      // Load all employers + all candidates for the Employers Data tab and All Candidates view
      const [{ data: empAll }, { data: candAll }, { data: privilegedRoles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, company_name, created_at")
          .eq("role", "employer")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, email, mobile, preferred_role, experience_level, highest_qualification, location, current_state, current_district, resume_url, registration_number, created_at, category, segment, preferred_state, preferred_district, primary_subject")
          .eq("role", "candidate")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["admin", "owner", "hr"]),
      ]);
      const excludeIds = new Set(((privilegedRoles as any[]) ?? []).map(r => r.user_id));
      const filteredEmployers = ((empAll as any[]) ?? []).filter(e => !excludeIds.has(e.id));
      setEmployers(filteredEmployers as EmployerRow[]);
      setAllCandidates(((candAll as any[]) ?? []) as AllCandidateRow[]);
    } catch (error) {
      console.error("Failed to refresh HR dashboard", error);
      if (!options?.silent) toast.error("Couldn't refresh HR dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user, profile?.role]);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/hr/login");
      return;
    }
    if (profile && (profile.role as string) !== "hr" && (profile.role as string) !== "hr_manager") {
      toast.error("This dashboard is for HR / HR Manager accounts only.");
      navigate("/");
    }
  }, [user, profile, authLoading, navigate]);

  // Resolve parent employer
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!user) return;
    const refreshVisibleDashboard = () => {
      if (document.visibilityState === "visible") {
        loadDashboardData({ silent: true });
      }
    };

    window.addEventListener("focus", refreshVisibleDashboard);
    document.addEventListener("visibilitychange", refreshVisibleDashboard);
    return () => {
      window.removeEventListener("focus", refreshVisibleDashboard);
      document.removeEventListener("visibilitychange", refreshVisibleDashboard);
    };
  }, [user, loadDashboardData]);

  const handleLogout = async () => {
    await logout();
    navigate("/hr/login");
  };

  const employerMenu = [
    { id: "invite-employer", label: "Invite Employer", icon: Building },
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "employers", label: "Employers Data", icon: Building },
    { id: "post", label: "Post Job", icon: Plus },
    { id: "vacancies", label: "Vacancies", icon: Briefcase },
  ];
  const candidateMenu = [
    { id: "candidates", label: "Candidates", icon: Users },
    { id: "candidates-data", label: "Candidates Data", icon: UserSquare2 },
    { id: "invite-candidate", label: "Invite a Candidate", icon: Mail },
    { id: "email-status", label: "Email Status", icon: Mail },
    { id: "candidate-info", label: "Candidate Info", icon: FileSpreadsheet },
    { id: "cv-scrutiny", label: "CV Scrutiny", icon: ScanSearch },
    { id: "pipeline", label: "Pipeline", icon: GitBranch },
    { id: "interviews", label: "Interviews", icon: Calendar },
  ];
  const menuItems =
    view === "employer" ? employerMenu :
    view === "candidate" ? candidateMenu :
    [...employerMenu, ...candidateMenu];

  const openJobsCount = jobs.filter(j => {
    const s = (j.status || "").toLowerCase();
    return s === "approved" || s === "open";
  }).length;
  const inPipelineCount = candidates.filter(c => c.status !== "rejected" && c.status !== "hired").length;

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Linked Employer</p>
                  <p className="text-base font-semibold">{parentEmployerName || "—"}</p>
                  {parentEmployerEmail && (
                    <p className="text-xs text-muted-foreground">{parentEmployerEmail}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Permissions</p>
                  <p className="text-xs">View jobs · Manage candidates · Schedule interviews</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Jobs</p><p className="text-2xl font-bold">{loading ? "…" : jobs.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Jobs</p><p className="text-2xl font-bold">{loading ? "…" : openJobsCount}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Candidates</p><p className="text-2xl font-bold">{loading ? "…" : candidates.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Pipeline</p><p className="text-2xl font-bold">{loading ? "…" : inPipelineCount}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent Jobs</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
                  : jobs.length === 0 ? <p className="text-sm text-muted-foreground">No jobs yet.</p>
                  : (
                    <div className="space-y-2">
                      {jobs.slice(0, 5).map(j => (
                        <div key={j.id} className="border border-border rounded-md p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{j.job_title}</p>
                            <p className="text-xs text-muted-foreground">{j.location || "—"} · {new Date(j.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline">{j.status || "draft"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        );
      case "jobs":
      case "vacancies": {
        const statusOptions = ["all", "active", "approved", "open", "draft", "closed", "rejected", "pending"];
        const filtered = jobs.filter(j => {
          if (jobStatusFilter === "all") return true;
          const s = (j.status || "draft").toLowerCase();
          if (jobStatusFilter === "active") return s === "active" || s === "approved" || s === "open";
          return s === jobStatusFilter;
        });
        const counts: Record<string, number> = { all: jobs.length };
        jobs.forEach(j => {
          const s = (j.status || "draft").toLowerCase();
          counts[s] = (counts[s] || 0) + 1;
          if (s === "active" || s === "approved" || s === "open") counts.active = (counts.active || 0) + 1;
        });
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Jobs Posted by {parentEmployerName}</CardTitle>
              <div className="flex flex-wrap items-center gap-1">
                {statusOptions.map(opt => (
                  <Button
                    key={opt}
                    size="sm"
                    variant={jobStatusFilter === opt ? "default" : "outline"}
                    className="h-7 text-xs capitalize"
                    onClick={() => setJobStatusFilter(opt)}
                  >
                    {opt} {counts[opt] ? <span className="ml-1 opacity-70">({counts[opt]})</span> : null}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : filtered.length === 0 ? <p className="text-sm text-muted-foreground">No jobs match this filter.</p>
                : (
                <div className="space-y-2">
                  {filtered.map(j => {
                    const applyUrl = `${window.location.origin}/job/${j.id}/apply`;
                    const copyLink = async () => {
                      try {
                        await navigator.clipboard.writeText(applyUrl);
                        toast.success("Apply link copied — share it with candidates");
                      } catch {
                        toast.error("Couldn't copy. Open the link manually.");
                      }
                    };
                    const shareLink = async () => {
                      const shareData = {
                        title: j.job_title,
                        text: `Apply for ${j.job_title} at ${parentEmployerName}`,
                        url: applyUrl,
                      };
                      if ((navigator as any).share) {
                        try { await (navigator as any).share(shareData); } catch {}
                      } else {
                        copyLink();
                      }
                    };
                    return (
                      <div key={j.id} className="border border-border rounded-md p-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                          <p className="font-medium text-sm">{j.job_title}</p>
                          <p className="text-xs text-muted-foreground">{j.location || "—"} · {new Date(j.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{j.status || "draft"}</Badge>
                          <Button size="sm" variant="outline" onClick={copyLink} title="Copy apply link">
                            <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                          </Button>
                          <Button size="sm" variant="outline" onClick={shareLink} title="Share apply link">
                            <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => window.open(applyUrl, "_blank")} title="Open public apply page">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      }
      case "post":
        return parentEmployerId ? (
          <HRJobPostingWizard
            parentEmployerId={parentEmployerId}
            parentEmployerName={parentEmployerName}
            onPosted={async () => {
              if (parentEmployerId) await reloadJobs(parentEmployerId);
              setActiveTab("jobs");
            }}
            onCancel={() => setActiveTab("jobs")}
          />
        ) : (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Linked employer not found. Contact your admin.</CardContent></Card>
        );
      case "candidates":
        return (
          <div className="space-y-4">
            <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base">Real Applicants</CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    placeholder="Search by name, email, mobile, code…"
                    className="pl-8 h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const q = candidateSearch.trim().toLowerCase();
                const filtered = q
                  ? candidates.filter(c => {
                      const hay = [
                        c.candidate_name, c.candidate_email, c.mobile, c.registration_number,
                        c.job_title, c.current_stage, c.status, c.category, c.segment,
                        c.preferred_state, c.preferred_district, c.location, c.primary_subject, c.preferred_role,
                      ].filter(Boolean).join(" ").toLowerCase();
                      return hay.includes(q);
                    })
                  : candidates;
                return loading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : candidates.length === 0 ? <p className="text-sm text-muted-foreground">No real candidates yet — the sample above shows how all options work.</p>
                : filtered.length === 0 ? <p className="text-sm text-muted-foreground">No candidates match "{candidateSearch}".</p>
                : (
                  <div className="space-y-2">
                    {candidates.map(c => (
                      <div key={c.id} role="button" tabIndex={0} onClick={() => setSelectedCandidateId(c.candidate_id)} onKeyDown={(e) => { if (e.key === "Enter") setSelectedCandidateId(c.candidate_id); }} className="border border-border rounded-md p-3 space-y-2 cursor-pointer hover:bg-muted/40 hover:border-primary/40 transition-colors">

                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{c.candidate_name}</p>
                            <p className="text-xs text-muted-foreground">{c.job_title} · {c.current_stage || "—"}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {c.ai_score != null && <Badge variant="secondary">AI {c.ai_score}%</Badge>}
                            <Badge variant="outline">{c.status || "pending"}</Badge>
                            <Button size="sm" variant="outline" onClick={() => setSelectedCandidateId(c.candidate_id)}>
                              <FileText className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 text-[11px] pt-1 border-t border-border/50">
                          <div><span className="text-muted-foreground">Date: </span><span className="font-medium">{c.applied_at ? new Date(c.applied_at).toLocaleDateString() : "—"}</span></div>
                          <div><span className="text-muted-foreground">Code: </span><span className="font-medium">{c.registration_number || "—"}</span></div>
                          <div><span className="text-muted-foreground">Mobile: </span><span className="font-medium">{c.mobile || "—"}</span></div>
                          <div><span className="text-muted-foreground">Sector: </span><span className="font-medium">{c.category || "—"}</span></div>
                          <div><span className="text-muted-foreground">Segment: </span><span className="font-medium">{c.segment || "—"}</span></div>
                          <div><span className="text-muted-foreground">Pref State: </span><span className="font-medium">{c.preferred_state || "—"}</span></div>
                          <div><span className="text-muted-foreground">Pref Location: </span><span className="font-medium">{c.preferred_district || c.location || "—"}</span></div>
                          <div><span className="text-muted-foreground">Subject: </span><span className="font-medium">{c.primary_subject || "—"}</span></div>
                          <div><span className="text-muted-foreground">Designation: </span><span className="font-medium">{c.preferred_role || "—"}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">All Registered Candidates ({allCandidates.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : allCandidates.length === 0 ? <p className="text-sm text-muted-foreground">No candidates registered yet.</p>
                : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {allCandidates.map(c => {
                      const sector = c.category || "—";
                      const segment = c.segment || "—";
                      const prefState = c.preferred_state || "—";
                      const prefLoc = c.preferred_district || c.location || "—";
                      const subject = c.primary_subject || "—";
                      const designation = c.preferred_role || "—";
                      return (
                        <div key={c.id} role="button" tabIndex={0} onClick={() => setSelectedCandidateId(c.id)} onKeyDown={(e) => { if (e.key === "Enter") setSelectedCandidateId(c.id); }} className="border border-border rounded-md p-3 space-y-2 cursor-pointer hover:bg-muted/40 hover:border-primary/40 transition-colors">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">{c.full_name || "Candidate"}</p>
                                {c.registration_number && <Badge variant="outline" className="text-[10px]">{c.registration_number}</Badge>}
                                {c.experience_level && <Badge variant="secondary" className="text-[10px]">{c.experience_level}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{c.email || "—"}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</span>
                              {c.resume_url && (
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); window.open(c.resume_url!, "_blank"); }}>
                                  <FileText className="h-3.5 w-3.5 mr-1" /> Resume
                                </Button>
                              )}
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); setTransferCandidate({ id: c.id, name: c.full_name || "Candidate" }); }}>
                                <Send className="h-3.5 w-3.5 mr-1" /> Transfer
                              </Button>
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedCandidateId(c.id); }}>
                                <FileText className="h-3.5 w-3.5 mr-1" /> View
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 text-[11px] pt-1 border-t border-border/50">
                            <div><span className="text-muted-foreground">Code: </span><span className="font-medium">{c.registration_number || "—"}</span></div>
                            <div><span className="text-muted-foreground">Mobile: </span><span className="font-medium">{c.mobile || "—"}</span></div>
                            <div><span className="text-muted-foreground">Sector: </span><span className="font-medium">{sector}</span></div>
                            <div><span className="text-muted-foreground">Segment: </span><span className="font-medium">{segment}</span></div>
                            <div><span className="text-muted-foreground">Pref State: </span><span className="font-medium">{prefState}</span></div>
                            <div><span className="text-muted-foreground">Pref Location: </span><span className="font-medium">{prefLoc}</span></div>
                            <div><span className="text-muted-foreground">Subject: </span><span className="font-medium">{subject}</span></div>
                            <div><span className="text-muted-foreground">Designation: </span><span className="font-medium">{designation}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </CardContent>
          </Card>
          </div>
        );
      case "employers":
        return (
          <Card>
            <CardHeader><CardTitle className="text-base">Employer Accounts ({employers.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : employers.length === 0 ? <p className="text-sm text-muted-foreground">No employer accounts found.</p>
                : (
                  <div className="space-y-2 max-h-[700px] overflow-y-auto">
                    {employers.map(e => (
                      <div key={e.id} className="border border-border rounded-md p-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{e.company_name || e.full_name || "Employer"}</p>
                            <p className="text-xs text-muted-foreground truncate">{e.email || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleDateString() : ""}</span>
                          <Badge variant="outline">Employer</Badge>
                          <Button size="sm" onClick={() => setTransferEmployer({ id: e.id, name: e.company_name || e.full_name || "Employer" })}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Transfer to Candidate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        );
      case "invite-employer":
        return (
          <HRInviteEmployer
            hrName={profile?.full_name || "HR Team"}
            companyName={parentEmployerName || "Gradia"}
            hrEmail={user?.email || "info@gradiaa.com"}
          />
        );
      case "candidates-data":
        return parentEmployerId && user ? (
          <HRCandidatesData
            hrUserId={user.id}
            employerUserId={parentEmployerId}
            employerName={parentEmployerName}
          />
        ) : (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Linked employer not found.</CardContent></Card>
        );
      case "email-status":
        return <HREmailStatus />;
      case "invite-candidate":
        return (
          <HRInviteCandidate
            hrName={profile?.full_name || "HR Team"}
            companyName={parentEmployerName || "Gradia"}
            hrEmail={user?.email || "info@gradiaa.com"}
          />
        );
      case "candidate-info":
        return parentEmployerId && user ? (
          <HRCandidateInfoSheet
            hrUserId={user.id}
            employerUserId={parentEmployerId}
            employerName={parentEmployerName}
          />
        ) : (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Linked employer not found.</CardContent></Card>
        );
      case "cv-scrutiny":
        return user ? (
          <HRCVScrutiny
            hrUserId={user.id}
            employerUserId={parentEmployerId || ""}
            employerName={parentEmployerName || "Gradia"}
          />
        ) : (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>
        );
      case "pipeline":
        return <SampleCandidateDemo />;
      case "interviews":
        return <Card><CardContent className="p-6 text-sm text-muted-foreground">Interview scheduling and feedback can be performed from each candidate's profile.</CardContent></Card>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-subtle">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <img src={gradiaLogo} alt="Gradia" className="h-6 w-auto" />
          <Badge variant="secondary" className="gap-1 text-xs">
            <Users className="h-3 w-3" /> HR
          </Badge>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex pt-14 md:pt-0">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed md:sticky top-14 md:top-0 left-0 h-[calc(100vh-3.5rem)] md:h-screen bg-card border-r border-border transition-all duration-300 z-40 overflow-hidden",
            sidebarOpen ? "w-64" : "w-0 md:w-64"
          )}
        >
          <div className="flex flex-col h-full w-64">
            {/* Logo */}
            <div className="hidden md:flex items-center gap-2 p-4 border-b border-border">
              <img src={gradiaLogo} alt="Gradia" className="h-7 w-auto flex-shrink-0" />
              <Badge variant="secondary" className="gap-1 text-xs">
                <Users className="h-3 w-3" /> HR Portal
              </Badge>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-border">
              <p className="text-sm font-medium truncate">{profile?.full_name || "HR User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedCandidateId(null);
                      setActiveTab(item.id);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 top-14 bg-background/80 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 min-h-screen overflow-x-hidden">
          <div className="container mx-auto p-4 md:p-6 max-w-7xl min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold capitalize">
                {menuItems.find(m => m.id === activeTab)?.label || "Dashboard"}
              </h1>
              <div className="flex items-center gap-2">
                {view !== "all" && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/hr/dashboard")} className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Change Workspace
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => loadDashboardData()} disabled={loading}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedCandidateId ? (
              <HRCandidateProfileDialog
                open={true}
                onClose={() => setSelectedCandidateId(null)}
                candidateId={selectedCandidateId}
              />
            ) : (
              renderContent()
            )}
          </div>
        </main>
      </div>


      {transferCandidate && user && (
        <TransferCandidateDialog
          open={!!transferCandidate}
          onOpenChange={(v) => !v && setTransferCandidate(null)}
          hrUserId={user.id}
          candidateId={transferCandidate.id}
          candidateName={transferCandidate.name}
        />
      )}
      {transferEmployer && user && (
        <TransferEmployerDialog
          open={!!transferEmployer}
          onOpenChange={(v) => !v && setTransferEmployer(null)}
          hrUserId={user.id}
          employerId={transferEmployer.id}
          employerName={transferEmployer.name}
        />
      )}
    </div>
  );
};

export default HRDashboard;
