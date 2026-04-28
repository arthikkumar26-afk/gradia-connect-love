import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Users, GitBranch, Calendar, LogOut, Building2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import gradiaLogo from "@/assets/gradia-logo.png";
import HRJobPostingWizard from "@/components/hr/HRJobPostingWizard";

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
  const [activeTab, setActiveTab] = useState("jobs");

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

  return (
    <div className="min-h-screen bg-subtle">
      {/* Top bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={gradiaLogo} alt="Gradia" className="h-8 w-auto" />
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" /> HR Portal
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.full_name || "HR User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Linked Employer banner */}
        <Card className="mb-6">
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Jobs</p><p className="text-2xl font-bold">{loading ? "…" : jobs.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Jobs</p><p className="text-2xl font-bold">{loading ? "…" : jobs.filter(j => (j.status || "").toLowerCase() === "approved" || (j.status || "").toLowerCase() === "open").length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Candidates</p><p className="text-2xl font-bold">{loading ? "…" : candidates.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Pipeline</p><p className="text-2xl font-bold">{loading ? "…" : candidates.filter(c => c.status !== "rejected" && c.status !== "hired").length}</p></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="jobs"><Briefcase className="h-4 w-4 mr-1" /> Jobs</TabsTrigger>
            <TabsTrigger value="post"><Plus className="h-4 w-4 mr-1" /> Post Job</TabsTrigger>
            <TabsTrigger value="candidates"><Users className="h-4 w-4 mr-1" /> Candidates</TabsTrigger>
            <TabsTrigger value="pipeline"><GitBranch className="h-4 w-4 mr-1" /> Pipeline</TabsTrigger>
            <TabsTrigger value="interviews"><Calendar className="h-4 w-4 mr-1" /> Interviews</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
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
                    {jobs.map(j => (
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
          </TabsContent>

          <TabsContent value="post">
            {parentEmployerId ? (
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
            )}
          </TabsContent>

          <TabsContent value="candidates">
            <Card>
              <CardHeader><CardTitle className="text-base">Applicants</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
                  : candidates.length === 0 ? <p className="text-sm text-muted-foreground">No candidates yet.</p>
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
          </TabsContent>

          <TabsContent value="pipeline">
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Use the Candidates tab to open a candidate and progress them through interview rounds.</CardContent></Card>
          </TabsContent>

          <TabsContent value="interviews">
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Interview scheduling and feedback can be performed from each candidate's profile.</CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default HRDashboard;
