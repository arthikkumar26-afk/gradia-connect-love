import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, Trash2, Mail, FileSpreadsheet, Plus, Save, Calendar, ChevronRight, LayoutDashboard, Briefcase, GitBranch, Building2, FileText } from "lucide-react";
import { toast } from "sonner";

interface HRAccount {
  id: string;
  hr_user_id: string;
  is_active: boolean;
  created_at: string;
  profile: { id: string; full_name: string; email: string } | null;
}

export const HRManagementContent = () => {
  const [hrAccounts, setHrAccounts] = useState<HRAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [profileHr, setProfileHr] = useState<HRAccount | null>(null);

  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  const load = async () => {
    setLoading(true);
    // Capture current user for diagnostics
    const { data: u } = await supabase.auth.getUser();
    setCurrentUserEmail(u?.user?.email || "");

    // Try edge function first (returns full info)
    const { data, error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "list" },
    });

    if (!error && data?.hr_accounts) {
      setHrAccounts(data.hr_accounts);
      setLoading(false);
      return;
    }

    // Fallback: direct RLS query (works for any employer/admin/owner)
    if (u?.user?.id) {
      const { data: links } = await supabase
        .from("hr_employer_links")
        .select("id, hr_user_id, is_active, created_at")
        .eq("employer_user_id", u.user.id)
        .order("created_at", { ascending: false });
      const ids = (links ?? []).map((l: any) => l.hr_user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] as any[] };
      const map = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      setHrAccounts((links ?? []).map((l: any) => ({ ...l, profile: map[l.hr_user_id] || null })));
    } else if (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "create", ...form },
    });
    setCreating(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to create HR account");
      return;
    }
    if (data?.email_sent) {
      toast.success(`HR account created — credentials emailed to ${form.email}`);
    } else {
      toast.success(`HR account created for ${form.email}${data?.email_error ? ` (email failed: ${data.email_error})` : ""}`);
    }
    setForm({ full_name: "", email: "", password: "" });
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> HR Management</h2>
          <p className="text-sm text-muted-foreground">Create HR sub-accounts linked to your company. They can manage jobs, candidates, and interviews — but not billing or company settings.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-1" /> Add HR Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create HR Account</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
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
                <p className="text-xs text-muted-foreground">Share this with the HR user securely. They can sign in at /hr/login.</p>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Your HR Accounts</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
           : hrAccounts.length === 0 ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>No HR accounts linked to this employer login.</p>
                {currentUserEmail && (
                  <p className="text-xs">
                    Currently signed in as <span className="font-medium">{currentUserEmail}</span>.
                    HR accounts only show under the employer that created them. If you created the HR from a different employer login, sign in with that account.
                  </p>
                )}
              </div>
            ) : (
            <div className="space-y-2">
              {hrAccounts.map(a => (
                <div
                  key={a.id}
                  onClick={() => setProfileHr(a)}
                  className="border border-border rounded-md p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                      <Users className="h-4 w-4 text-pink-600 dark:text-pink-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{a.profile?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {a.profile?.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                    {a.is_active && (
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(a.hr_user_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HRActivitySection />

      <HRProfileDialog hr={profileHr} onClose={() => setProfileHr(null)} />
    </div>
  );
};

// ============================================================
// HR Profile Dialog — mirrors the entire HR panel (read-only)
// so the employer can review every job, candidate, status & sheet
// the HR is working on.
// ============================================================
interface HRJob { id: string; job_title: string; location: string | null; status: string | null; created_at: string }
interface HRCandidate {
  id: string; candidate_id: string; job_id: string;
  current_stage: string | null; status: string | null;
  ai_score: number | null; created_at: string;
  candidate_name?: string; job_title?: string;
}

const HRProfileDialog = ({ hr, onClose }: { hr: HRAccount | null; onClose: () => void }) => {
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [sheet, setSheet] = useState<{ rows: Record<string, string>[]; updated_at: string } | null>(null);
  const [jobs, setJobs] = useState<HRJob[]>([]);
  const [candidates, setCandidates] = useState<HRCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hr) { setSheet(null); setJobs([]); setCandidates([]); return; }
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setLoading(false); return; }
      const employerId = u.user.id;

      // Sheet columns + this HR's sheet rows
      const [{ data: colData }, { data: sheetData }] = await Promise.all([
        supabase.from("employer_hr_sheet_columns").select("columns").eq("employer_user_id", employerId).maybeSingle(),
        supabase.from("hr_candidate_sheets").select("rows, updated_at").eq("employer_user_id", employerId).eq("hr_user_id", hr.hr_user_id).maybeSingle(),
      ]);
      if (colData?.columns && Array.isArray(colData.columns)) setColumns(colData.columns as unknown as ColumnDef[]);
      setSheet(sheetData
        ? { rows: Array.isArray((sheetData as any).rows) ? (sheetData as any).rows : [], updated_at: (sheetData as any).updated_at }
        : { rows: [], updated_at: "" });

      // Jobs visible to the HR (employer's jobs)
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, job_title, location, status, created_at")
        .eq("employer_id", employerId)
        .order("created_at", { ascending: false });
      const jobList = (jobsData as HRJob[]) ?? [];
      setJobs(jobList);

      // Candidates pipeline for these jobs
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
      } else {
        setCandidates([]);
      }
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
            <Badge variant="secondary" className="text-xs ml-1">HR Panel · Read-only</Badge>
          </DialogTitle>
          {hr && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {hr.profile?.email || "—"}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {new Date(hr.created_at).toLocaleDateString()}</span>
              <span>Status: <Badge variant={hr.is_active ? "default" : "secondary"} className="text-[10px] py-0 px-1.5">{hr.is_active ? "Active" : "Inactive"}</Badge></span>
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

              {/* OVERVIEW */}
              <TabsContent value="overview" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Total Jobs</p><p className="text-xl font-bold">{loading ? "…" : jobs.length}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Open Jobs</p><p className="text-xl font-bold">{loading ? "…" : openJobs}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Candidates</p><p className="text-xl font-bold">{loading ? "…" : candidates.length}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">In Pipeline</p><p className="text-xl font-bold">{loading ? "…" : inPipeline}</p></CardContent></Card>
                </div>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Recent Activity</CardTitle></CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {loading ? <p className="text-xs text-muted-foreground">Loading…</p>
                     : candidates.length === 0 && jobs.length === 0 ? <p className="text-xs text-muted-foreground">No activity yet.</p>
                     : (
                      <>
                        {candidates.slice(0, 5).map(c => (
                          <div key={c.id} className="flex items-center justify-between text-xs border-b pb-1.5 last:border-0">
                            <span><span className="font-medium">{c.candidate_name}</span> · {c.job_title}</span>
                            <Badge variant="outline" className="text-[10px]">{c.status || "pending"}</Badge>
                          </div>
                        ))}
                      </>
                     )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* JOBS */}
              <TabsContent value="jobs" className="mt-0">
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm">Jobs accessible to this HR</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {loading ? <p className="text-xs text-muted-foreground">Loading…</p>
                     : jobs.length === 0 ? <p className="text-xs text-muted-foreground">No jobs posted yet.</p>
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* CANDIDATES */}
              <TabsContent value="candidates" className="mt-0">
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm">Candidates &amp; Pipeline Status</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {loading ? <p className="text-xs text-muted-foreground">Loading…</p>
                     : candidates.length === 0 ? <p className="text-xs text-muted-foreground">No candidates yet.</p>
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* CANDIDATE INFO SHEET */}
              <TabsContent value="sheet" className="mt-0">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" /> Candidate Info Sheet
                      {sheet?.updated_at && <span className="text-[11px] text-muted-foreground font-normal">(updated {new Date(sheet.updated_at).toLocaleString()})</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {loading ? <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
                     : !sheet || sheet.rows.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">This HR hasn't added any candidate rows yet.</p>
                     : (
                      <div className="overflow-auto border rounded-md">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="p-2 text-left w-10">#</th>
                              {columns.map(c => (
                                <th key={c.key} className="p-2 text-left font-medium whitespace-nowrap">{c.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.rows.map((row, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2 text-muted-foreground text-center">{idx + 1}</td>
                                {columns.map(c => (
                                  <td key={c.key} className="p-2 align-top">{row[c.key] || <span className="text-muted-foreground/50">—</span>}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                     )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ============================================================
// HR Activity Section — sheet schema editor + per-HR sheet view
// ============================================================
interface ColumnDef { key: string; label: string; type?: string }
interface HRSheetRow {
  id: string;
  hr_user_id: string;
  rows: Record<string, string>[];
  updated_at: string;
  hr_name?: string;
  hr_email?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Candidate Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `col_${Date.now()}`;

const HRActivitySection = () => {
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [sheets, setSheets] = useState<HRSheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCols, setSavingCols] = useState(false);
  const [selectedHrId, setSelectedHrId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { setLoading(false); return; }
    setUserId(u.user.id);

    const { data: colData } = await supabase
      .from("employer_hr_sheet_columns")
      .select("columns")
      .eq("employer_user_id", u.user.id)
      .maybeSingle();

    if (colData?.columns && Array.isArray(colData.columns)) {
      setColumns(colData.columns as unknown as ColumnDef[]);
    } else {
      await supabase.from("employer_hr_sheet_columns").insert({
        employer_user_id: u.user.id,
        columns: DEFAULT_COLUMNS as any,
      });
      setColumns(DEFAULT_COLUMNS);
    }

    const { data: sheetData } = await supabase
      .from("hr_candidate_sheets")
      .select("id, hr_user_id, rows, updated_at")
      .eq("employer_user_id", u.user.id)
      .order("updated_at", { ascending: false });

    const sheetsArr = (sheetData ?? []) as any[];
    const hrIds = Array.from(new Set(sheetsArr.map(s => s.hr_user_id)));
    const { data: profs } = hrIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", hrIds)
      : { data: [] as any[] };
    const map = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    setSheets(sheetsArr.map(s => ({
      ...s,
      rows: Array.isArray(s.rows) ? s.rows : [],
      hr_name: map[s.hr_user_id]?.full_name || "HR User",
      hr_email: map[s.hr_user_id]?.email || "",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addColumn = () => setColumns(c => [...c, { key: `col_${c.length + 1}_${Date.now()}`, label: "New Column" }]);
  const removeColumn = (idx: number) => setColumns(c => c.filter((_, i) => i !== idx));
  const updateColumn = (idx: number, label: string) =>
    setColumns(c => c.map((col, i) => i === idx ? { ...col, label, key: slugify(label) } : col));

  const saveColumns = async () => {
    if (!userId) return;
    setSavingCols(true);
    const { error } = await supabase
      .from("employer_hr_sheet_columns")
      .upsert({ employer_user_id: userId, columns: columns as any }, { onConflict: "employer_user_id" });
    setSavingCols(false);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Columns saved — HRs will see updated fields"); load(); }
  };

  const selectedSheet = sheets.find(s => s.hr_user_id === selectedHrId);
  const totalRows = sheets.reduce((sum, s) => sum + (s.rows?.length || 0), 0);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between flex-wrap gap-2 border-t pt-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> HR Work — Candidate Info Sheets
          </h2>
          <p className="text-xs text-muted-foreground">Live view of sheets your HR team is filling in.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">{sheets.length} HR{sheets.length !== 1 ? "s" : ""} active</Badge>
          <Badge variant="secondary">{totalRows} candidate rows</Badge>
        </div>
      </div>

      {/* Column schema editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm">Sheet Columns (visible to all your HRs)</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addColumn}><Plus className="h-3.5 w-3.5 mr-1" />Add Column</Button>
            <Button size="sm" onClick={saveColumns} disabled={savingCols}>
              <Save className="h-3.5 w-3.5 mr-1" />{savingCols ? "Saving…" : "Save Columns"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {columns.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  className="h-8 text-xs"
                  value={c.label}
                  onChange={e => updateColumn(idx, e.target.value)}
                  placeholder="Column label"
                />
                <Button size="icon" variant="ghost" onClick={() => removeColumn(idx)} className="h-8 w-8" disabled={columns.length <= 1}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sheets viewer */}
      {loading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading HR activity…</CardContent></Card>
      ) : sheets.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No HR has saved a candidate sheet yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-sm">HR Team</CardTitle></CardHeader>
            <CardContent className="p-0 max-h-[28rem] overflow-auto divide-y">
              {sheets.map(s => {
                const isActive = selectedHrId === s.hr_user_id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedHrId(s.hr_user_id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition ${isActive ? "bg-muted" : ""}`}
                  >
                    <p className="text-sm font-medium truncate">{s.hr_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.hr_email}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="outline" className="text-[10px]">{s.rows.length} rows</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(s.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {selectedSheet ? `${selectedSheet.hr_name}'s Sheet` : "Select an HR to view their sheet"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSheet ? (
                <p className="text-sm text-muted-foreground text-center py-8">Choose an HR from the list.</p>
              ) : selectedSheet.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">This HR hasn't added any rows yet.</p>
              ) : (
                <div className="overflow-auto border rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left w-10">#</th>
                        {columns.map(c => (
                          <th key={c.key} className="p-2 text-left font-medium whitespace-nowrap">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSheet.rows.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2 text-muted-foreground text-center">{idx + 1}</td>
                          {columns.map(c => (
                            <td key={c.key} className="p-2 align-top">{row[c.key] || <span className="text-muted-foreground/50">—</span>}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HRManagementContent;
