import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus, Users, Trash2, Mail, KeyRound, AtSign, Briefcase, ChevronRight,
  Building2, Calendar, ArrowLeft, FileSpreadsheet, LayoutDashboard, Search,
} from "lucide-react";
import { toast } from "sonner";

interface EmployerOption { id: string; full_name: string | null; email: string | null; company_name: string | null }
interface HRAccount {
  id: string;
  hr_user_id: string;
  employer_user_id: string;
  is_active: boolean;
  created_at: string;
  profile: { id: string; full_name: string; email: string } | null;
  employer_profile: { id: string; full_name: string; email: string; company_name: string | null } | null;
}
interface HRJob { id: string; job_title: string; location: string | null; status: string | null; created_at: string }
interface HRCandidate {
  id: string; candidate_id: string; job_id: string;
  current_stage: string | null; status: string | null;
  ai_score: number | null; created_at: string;
  candidate_name?: string; job_title?: string;
}

export default function AdminHRManagement() {
  const navigate = useNavigate();
  const [hrAccounts, setHrAccounts] = useState<HRAccount[]>([]);
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [employerFilter, setEmployerFilter] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [accountType, setAccountType] = useState<"hr" | "hr_manager">("hr");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", employer_id: "" });

  const [pwdTarget, setPwdTarget] = useState<HRAccount | null>(null);
  const [emailTarget, setEmailTarget] = useState<HRAccount | null>(null);
  const [profileHr, setProfileHr] = useState<HRAccount | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [sendPwdEmail, setSendPwdEmail] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { navigate("/admin/login"); return; }

    const [{ data: hrRes, error }, { data: empData }] = await Promise.all([
      supabase.functions.invoke("create-hr-account", { body: { action: "list" } }),
      supabase.from("profiles").select("id, full_name, email, company_name").eq("role", "employer").order("created_at", { ascending: false }),
    ]);

    if (error) toast.error(error.message);
    setHrAccounts(hrRes?.hr_accounts ?? []);
    setEmployers((empData ?? []) as EmployerOption[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hrAccounts.filter(a => {
      if (employerFilter !== "all" && a.employer_user_id !== employerFilter) return false;
      if (!q) return true;
      return (
        a.profile?.full_name?.toLowerCase().includes(q) ||
        a.profile?.email?.toLowerCase().includes(q) ||
        a.employer_profile?.company_name?.toLowerCase().includes(q) ||
        a.employer_profile?.full_name?.toLowerCase().includes(q) ||
        a.employer_profile?.email?.toLowerCase().includes(q)
      );
    });
  }, [hrAccounts, search, employerFilter]);

  const handleCreate = async () => {
    const isManager = accountType === "hr_manager";
    if (!form.full_name || !form.email || !form.password || (!isManager && !form.employer_id)) {
      toast.error(isManager ? "Please fill all fields" : "Please fill all fields including employer");
      return;
    }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "create", ...form, account_type: accountType, employer_id: isManager ? undefined : form.employer_id },
    });
    setCreating(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to create account");
      return;
    }
    if (data?.email_sent) toast.success(`${isManager ? "HR Manager" : "HR"} created — credentials emailed to ${form.email}`);
    else toast.success(`${isManager ? "HR Manager" : "HR"} created${data?.email_error ? ` (email failed: ${data.email_error})` : ""}`);
    setForm({ full_name: "", email: "", password: "", employer_id: "" });
    setAccountType("hr");
    setOpen(false);
    load();
  };

  const handleDeactivate = async (hr_user_id: string) => {
    if (!confirm("Deactivate this HR account? They will lose access immediately.")) return;
    const { error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "deactivate", hr_user_id },
    });
    if (error) toast.error(error.message);
    else { toast.success("HR account deactivated"); load(); }
  };

  const handleResetPassword = async () => {
    if (!pwdTarget) return;
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "reset_password", hr_user_id: pwdTarget.hr_user_id, new_password: newPassword, send_email: sendPwdEmail },
    });
    setSubmitting(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Failed"); return; }
    toast.success(sendPwdEmail && data?.email_sent ? "Password reset and emailed" : "Password reset");
    setPwdTarget(null); setNewPassword(""); setSendPwdEmail(true);
  };

  const handleResetEmail = async () => {
    if (!emailTarget) return;
    if (!newEmail.includes("@")) { toast.error("Enter a valid email"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "reset_email", hr_user_id: emailTarget.hr_user_id, new_email: newEmail },
    });
    setSubmitting(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Failed"); return; }
    toast.success("Email updated");
    setEmailTarget(null); setNewEmail("");
    load();
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> HR Management</h1>
              <p className="text-sm text-muted-foreground">Create HR sub-accounts for any employer and review their work.</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-1" /> Add HR / HR Manager</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Account</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Account Type</Label>
                  <Select value={accountType} onValueChange={(v) => setAccountType(v as "hr" | "hr_manager")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hr">HR (linked to one employer)</SelectItem>
                      <SelectItem value="hr_manager">HR Manager (full HR panel control)</SelectItem>
                    </SelectContent>
                  </Select>
                  {accountType === "hr_manager" && (
                    <p className="text-[11px] text-muted-foreground">HR Managers oversee all HR accounts and have full access to the HR panel across all employers.</p>
                  )}
                </div>
                {accountType === "hr" && (
                  <div className="space-y-1.5">
                    <Label>Employer (Company)</Label>
                    <Select value={form.employer_id} onValueChange={(v) => setForm({ ...form, employer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select an employer" /></SelectTrigger>
                      <SelectContent>
                        {employers.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.company_name || e.full_name || e.email} {e.email ? `· ${e.email}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="hr.jane@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Initial Password</Label>
                  <Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating…" : `Create ${accountType === "hr_manager" ? "HR Manager" : "HR"} Account`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">All HR Accounts ({hrAccounts.length})</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HR or company…" className="pl-8 h-9 w-64" />
                </div>
                <Select value={employerFilter} onValueChange={setEmployerFilter}>
                  <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employers</SelectItem>
                    {employers.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.company_name || e.full_name || e.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
             : filtered.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No HR accounts found.</p>
             : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-2">HR User</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Employer / Company</th>
                      <th className="p-2">Created</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => (
                      <tr key={a.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setProfileHr(a)}>
                        <td className="p-2 font-medium">{a.profile?.full_name || "—"}</td>
                        <td className="p-2 text-muted-foreground">{a.profile?.email || "—"}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{a.employer_profile?.company_name || a.employer_profile?.full_name || "—"}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{a.employer_profile?.email || ""}</p>
                        </td>
                        <td className="p-2 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                        <td className="p-2"><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge></td>
                        <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" title="Reset password" onClick={() => { setPwdTarget(a); setNewPassword(""); setSendPwdEmail(true); }}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Change email" onClick={() => { setEmailTarget(a); setNewEmail(a.profile?.email || ""); }}>
                            <AtSign className="h-4 w-4" />
                          </Button>
                          {a.is_active && (
                            <Button size="sm" variant="ghost" title="Deactivate" onClick={() => handleDeactivate(a.hr_user_id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <HRWorkDialog hr={profileHr} onClose={() => setProfileHr(null)} />

      {/* Reset password */}
      <Dialog open={!!pwdTarget} onOpenChange={(o) => !o && setPwdTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Reset HR Password</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">For <span className="font-medium">{pwdTarget?.profile?.email}</span></p>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sendPwdEmail} onChange={e => setSendPwdEmail(e.target.checked)} />
              Email new credentials to HR
            </label>
            <Button className="w-full" disabled={submitting} onClick={handleResetPassword}>
              {submitting ? "Resetting…" : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change email */}
      <Dialog open={!!emailTarget} onOpenChange={(o) => !o && setEmailTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AtSign className="h-4 w-4" /> Change HR Email</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">Current: <span className="font-medium">{emailTarget?.profile?.email}</span></p>
            <div className="space-y-1.5">
              <Label>New Email</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="hr.new@company.com" />
            </div>
            <Button className="w-full" disabled={submitting} onClick={handleResetEmail}>
              {submitting ? "Updating…" : "Update Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const HRWorkDialog = ({ hr, onClose }: { hr: HRAccount | null; onClose: () => void }) => {
  const [jobs, setJobs] = useState<HRJob[]>([]);
  const [candidates, setCandidates] = useState<HRCandidate[]>([]);
  const [sheet, setSheet] = useState<{ rows: Record<string, string>[]; updated_at: string } | null>(null);
  const [columns, setColumns] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hr) { setJobs([]); setCandidates([]); setSheet(null); return; }
    (async () => {
      setLoading(true);
      const employerId = hr.employer_user_id;

      const [{ data: colData }, { data: sheetData }, { data: jobsData }] = await Promise.all([
        supabase.from("employer_hr_sheet_columns").select("columns").eq("employer_user_id", employerId).maybeSingle(),
        supabase.from("hr_candidate_sheets").select("rows, updated_at").eq("employer_user_id", employerId).eq("hr_user_id", hr.hr_user_id).maybeSingle(),
        supabase.from("jobs").select("id, job_title, location, status, created_at").eq("employer_id", employerId).order("created_at", { ascending: false }),
      ]);
      if (colData?.columns && Array.isArray(colData.columns)) setColumns(colData.columns as any);
      setSheet(sheetData
        ? { rows: Array.isArray((sheetData as any).rows) ? (sheetData as any).rows : [], updated_at: (sheetData as any).updated_at }
        : { rows: [], updated_at: "" });

      const jobList = (jobsData as HRJob[]) ?? [];
      setJobs(jobList);
      const jobIds = jobList.map(j => j.id);
      if (jobIds.length) {
        const { data: cands } = await supabase
          .from("interview_candidates")
          .select("id, candidate_id, job_id, current_stage, status, ai_score, created_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false })
          .limit(200);
        const candIds = Array.from(new Set((cands ?? []).map((c: any) => c.candidate_id)));
        const { data: profs } = candIds.length
          ? await supabase.from("profiles").select("id, full_name").in("id", candIds)
          : { data: [] as any[] };
        const nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
        const titleMap = Object.fromEntries(jobList.map(j => [j.id, j.job_title]));
        setCandidates((cands ?? []).map((c: any) => ({
          ...c,
          candidate_name: nameMap[c.candidate_id] || "Candidate",
          job_title: titleMap[c.job_id] || "—",
        })));
      } else setCandidates([]);
      setLoading(false);
    })();
  }, [hr?.hr_user_id]);

  const openJobs = jobs.filter(j => { const s = (j.status || "").toLowerCase(); return s === "approved" || s === "open"; }).length;
  const inPipeline = candidates.filter(c => c.status !== "rejected" && c.status !== "hired").length;

  return (
    <Dialog open={!!hr} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" /> {hr?.profile?.full_name || "HR Profile"}
            <Badge variant="secondary" className="text-xs ml-1">Admin · Read-only</Badge>
          </DialogTitle>
          {hr && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {hr.profile?.email || "—"}</span>
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {hr.employer_profile?.company_name || hr.employer_profile?.full_name || "—"}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {new Date(hr.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </DialogHeader>
        {hr && (
          <div className="flex-1 overflow-auto px-5 py-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="overview" className="text-xs gap-1"><LayoutDashboard className="h-3.5 w-3.5" />Overview</TabsTrigger>
                <TabsTrigger value="jobs" className="text-xs gap-1"><Briefcase className="h-3.5 w-3.5" />Jobs</TabsTrigger>
                <TabsTrigger value="candidates" className="text-xs gap-1"><Users className="h-3.5 w-3.5" />Candidates</TabsTrigger>
                <TabsTrigger value="sheet" className="text-xs gap-1"><FileSpreadsheet className="h-3.5 w-3.5" />Info Sheet</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Total Jobs</p><p className="text-xl font-bold">{loading ? "…" : jobs.length}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Open Jobs</p><p className="text-xl font-bold">{loading ? "…" : openJobs}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Candidates</p><p className="text-xl font-bold">{loading ? "…" : candidates.length}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">In Pipeline</p><p className="text-xl font-bold">{loading ? "…" : inPipeline}</p></CardContent></Card>
                </div>
              </TabsContent>

              <TabsContent value="jobs" className="mt-0">
                <Card><CardContent className="p-3">
                  {loading ? <p className="text-xs text-muted-foreground">Loading…</p>
                   : jobs.length === 0 ? <p className="text-xs text-muted-foreground">No jobs.</p>
                   : (
                    <div className="space-y-1.5">
                      {jobs.map(j => (
                        <div key={j.id} className="border rounded-md p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-medium text-sm">{j.job_title}</p>
                            <p className="text-[11px] text-muted-foreground">{j.location || "—"} · {new Date(j.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline">{j.status || "draft"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="candidates" className="mt-0">
                <Card><CardContent className="p-3">
                  {loading ? <p className="text-xs text-muted-foreground">Loading…</p>
                   : candidates.length === 0 ? <p className="text-xs text-muted-foreground">No candidates.</p>
                   : (
                    <div className="overflow-auto border rounded-md">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-2 text-left">Candidate</th>
                            <th className="p-2 text-left">Job</th>
                            <th className="p-2 text-left">Stage</th>
                            <th className="p-2 text-left">AI Score</th>
                            <th className="p-2 text-left">Status</th>
                            <th className="p-2 text-left">Applied</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.map(c => (
                            <tr key={c.id} className="border-t">
                              <td className="p-2 font-medium">{c.candidate_name}</td>
                              <td className="p-2">{c.job_title}</td>
                              <td className="p-2">{c.current_stage || "—"}</td>
                              <td className="p-2">{c.ai_score != null ? `${c.ai_score}%` : "—"}</td>
                              <td className="p-2"><Badge variant="outline" className="text-[10px]">{c.status || "pending"}</Badge></td>
                              <td className="p-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="sheet" className="mt-0">
                <Card><CardContent className="p-3">
                  {loading ? <p className="text-xs text-muted-foreground">Loading…</p>
                   : !sheet || sheet.rows.length === 0 ? <p className="text-xs text-muted-foreground">No sheet rows yet.</p>
                   : (
                    <div className="overflow-auto border rounded-md">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-2 text-left w-10">#</th>
                            {columns.map(c => <th key={c.key} className="p-2 text-left whitespace-nowrap">{c.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {sheet.rows.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2 text-muted-foreground text-center">{idx + 1}</td>
                              {columns.map(c => <td key={c.key} className="p-2 align-top">{row[c.key] || <span className="text-muted-foreground/50">—</span>}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
