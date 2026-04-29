import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2, Users, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface ColumnDef { key: string; label: string; type?: string }
interface HRSheet {
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
  { key: "resume", label: "Resume", type: "resume" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
];

const isResumeColumn = (c: ColumnDef) =>
  c.type === "resume" ||
  c.key.toLowerCase() === "resume" ||
  /resume|cv/i.test(c.label);

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `col_${Date.now()}`;

export default function HRActivity() {
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [sheets, setSheets] = useState<HRSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCols, setSavingCols] = useState(false);
  const [selectedHrId, setSelectedHrId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Columns - upsert default if missing
    const { data: colData } = await supabase
      .from("employer_hr_sheet_columns")
      .select("columns")
      .eq("employer_user_id", user.id)
      .maybeSingle();

    if (colData?.columns && Array.isArray(colData.columns)) {
      let loaded = colData.columns as unknown as ColumnDef[];
      const hasResume = loaded.some(isResumeColumn);
      if (!hasResume) {
        loaded = [...loaded, { key: "resume", label: "Resume", type: "resume" }];
      } else {
        loaded = loaded.map(c => isResumeColumn(c) ? { ...c, type: "resume" } : c);
      }
      setColumns(loaded);
    } else {
      // initialize with defaults
      await supabase.from("employer_hr_sheet_columns").insert({
        employer_user_id: user.id,
        columns: DEFAULT_COLUMNS as any,
      });
      setColumns(DEFAULT_COLUMNS);
    }

    // Sheets from all HRs (RLS returns only this employer's)
    const { data: sheetData } = await supabase
      .from("hr_candidate_sheets")
      .select("id, hr_user_id, rows, updated_at")
      .eq("employer_user_id", user.id)
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

  useEffect(() => { load(); }, [user?.id]);

  const addColumn = () => setColumns(c => [...c, { key: `col_${c.length + 1}_${Date.now()}`, label: "New Column" }]);
  const removeColumn = (idx: number) => setColumns(c => c.filter((_, i) => i !== idx));
  const updateColumn = (idx: number, label: string) =>
    setColumns(c => c.map((col, i) => i === idx ? { ...col, label, key: slugify(label) } : col));

  const saveColumns = async () => {
    if (!user) return;
    setSavingCols(true);
    const { error } = await supabase
      .from("employer_hr_sheet_columns")
      .upsert({ employer_user_id: user.id, columns: columns as any }, { onConflict: "employer_user_id" });
    setSavingCols(false);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Columns saved — HRs will see updated fields"); load(); }
  };

  const selectedSheet = sheets.find(s => s.hr_user_id === selectedHrId);
  const totalRows = useMemo(() => sheets.reduce((sum, s) => sum + (s.rows?.length || 0), 0), [sheets]);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">HR Activity</h1>
          <p className="text-xs text-muted-foreground">Live view of work your HR team is doing.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> {sheets.length} HR{sheets.length !== 1 ? "s" : ""} active</Badge>
          <Badge variant="secondary">{totalRows} candidate rows</Badge>
        </div>
      </div>

      {/* Column schema editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Sheet Columns (visible to all your HRs)</CardTitle>
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
            <CardHeader><CardTitle className="text-base">HR Team</CardTitle></CardHeader>
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
              <CardTitle className="text-base flex items-center gap-2">
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
                          <td key={c.key} className="p-2 align-top">
                            {(() => {
                              const v = row[c.key];
                              if (!v) return <span className="text-muted-foreground/50">—</span>;
                              if (isResumeColumn(c) && /^https?:\/\//i.test(v)) {
                                return (
                                  <a
                                    href={v}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    View Resume
                                  </a>
                                );
                              }
                              return v;
                            })()}
                          </td>
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
}
