import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Users, Trash2, Mail, FileSpreadsheet, Plus, Save, Calendar, ChevronRight } from "lucide-react";
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
                <div key={a.id} className="border border-border rounded-md p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                      <Users className="h-4 w-4 text-pink-600 dark:text-pink-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{a.profile?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {a.profile?.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                    {a.is_active && (
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(a.hr_user_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HRActivitySection />
    </div>
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
