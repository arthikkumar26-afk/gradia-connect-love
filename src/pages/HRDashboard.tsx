import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, GitBranch, Calendar, LogOut, Building2, FileText, Plus, LayoutDashboard, Menu, X, Copy, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import gradiaLogo from "@/assets/gradia-logo.png";
import HRJobPostingWizard from "@/components/hr/HRJobPostingWizard";
import SampleCandidateDemo from "@/components/hr/SampleCandidateDemo";

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
  created_at: string;
  ai_score: number | null;
  candidate_name?: string;
  job_title?: string;
}

const HRDashboard = () => {
  const { user, profile, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [parentEmployerId, setParentEmployerId] = useState<string | null>(null);
  const [parentEmployerName, setParentEmployerName] = useState<string>("");
  const [parentEmployerEmail, setParentEmployerEmail] = useState<string>("");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const reloadJobs = async (employerId: string) => {
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, job_title, location, status, created_at")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false });
    setJobs((jobsData as JobRow[]) ?? []);
  };

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/hr/login");
      return;
    }
    if (profile && (profile.role as string) !== "hr") {
      toast.error("This dashboard is for HR accounts only.");
      navigate("/");
    }
  }, [user, profile, authLoading, navigate]);

  // Resolve parent employer
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data: link } = await supabase
        .from("hr_employer_links")
        .select("employer_user_id, is_active")
        .eq("hr_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!link) {
        toast.error("Your HR account is not linked to any Employer yet. Contact your Employer admin.");
        setLoading(false);
        return;
      }
      setParentEmployerId(link.employer_user_id);

      const { data: empProfile } = await supabase
        .from("profiles")
        .select("full_name, company_name, email")
        .eq("id", link.employer_user_id)
        .maybeSingle();
      setParentEmployerName(empProfile?.company_name || empProfile?.full_name || "Linked Employer");
      setParentEmployerEmail(empProfile?.email || "");

      // Jobs
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, job_title, location, status, created_at")
        .eq("employer_id", link.employer_user_id)
        .order("created_at", { ascending: false });
      setJobs((jobsData as JobRow[]) ?? []);

      // Candidates
      const jobIds = (jobsData ?? []).map((j: any) => j.id);
      if (jobIds.length) {
        const { data: cands } = await supabase
          .from("interview_candidates")
          .select("id, candidate_id, job_id, current_stage, status, created_at, ai_score")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false })
          .limit(200);

        const candIds = Array.from(new Set((cands ?? []).map((c: any) => c.candidate_id)));
        const { data: profs } = candIds.length
          ? await supabase.from("profiles").select("id, full_name").in("id", candIds)
          : { data: [] as any[] };
        const nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
        const titleMap = Object.fromEntries((jobsData ?? []).map((j: any) => [j.id, j.job_title]));
        setCandidates(
          (cands ?? []).map((c: any) => ({
            ...c,
            candidate_name: nameMap[c.candidate_id] || "Candidate",
            job_title: titleMap[c.job_id] || "—",
          }))
        );
      } else {
        setCandidates([]);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/hr/login");
  };

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "post", label: "Post Job", icon: Plus },
    { id: "candidates", label: "Candidates", icon: Users },
    { id: "pipeline", label: "Pipeline", icon: GitBranch },
    { id: "interviews", label: "Interviews", icon: Calendar },
  ];

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
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Jobs Posted by {parentEmployerName}</CardTitle>
              <Button size="sm" onClick={() => setActiveTab("post")}>
                <Plus className="h-4 w-4 mr-1" /> Post New Job
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : jobs.length === 0 ? <p className="text-sm text-muted-foreground">No jobs yet.</p>
                : (
                <div className="space-y-2">
                  {jobs.map(j => {
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
            <SampleCandidateDemo />
            <Card>
            <CardHeader><CardTitle className="text-base">Real Applicants</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : candidates.length === 0 ? <p className="text-sm text-muted-foreground">No real candidates yet — the sample above shows how all options work.</p>
                : (
                  <div className="space-y-2">
                    {candidates.map(c => (
                      <div key={c.id} className="border border-border rounded-md p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{c.candidate_name}</p>
                          <p className="text-xs text-muted-foreground">{c.job_title} · {c.current_stage || "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.ai_score != null && <Badge variant="secondary">AI {c.ai_score}%</Badge>}
                          <Badge variant="outline">{c.status || "pending"}</Badge>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/employer/candidate/${c.candidate_id}?interview=${c.id}`)}>
                            <FileText className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
          </div>
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
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
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

      <div className="flex pt-14 lg:pt-0">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-14 lg:top-0 left-0 h-[calc(100vh-3.5rem)] lg:h-screen bg-card border-r border-border transition-all duration-300 z-40 overflow-hidden",
            sidebarOpen ? "w-64" : "w-0 lg:w-20"
          )}
        >
          <div className="flex flex-col h-full w-64">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-2 p-4 border-b border-border">
              <img src={gradiaLogo} alt="Gradia" className="h-7 w-auto flex-shrink-0" />
              {sidebarOpen && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Users className="h-3 w-3" /> HR Portal
                </Badge>
              )}
            </div>

            {/* User Info */}
            {sidebarOpen && (
              <div className="p-4 border-b border-border">
                <p className="text-sm font-medium truncate">{profile?.full_name || "HR User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
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
                {sidebarOpen && <span>Logout</span>}
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 top-14 bg-background/80 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main */}
        <main className="flex-1 min-h-screen">
          <div className="container mx-auto p-4 md:p-6 max-w-7xl">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold capitalize">
                {menuItems.find(m => m.id === activeTab)?.label || "Dashboard"}
              </h1>
              <div className="hidden lg:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HRDashboard;
