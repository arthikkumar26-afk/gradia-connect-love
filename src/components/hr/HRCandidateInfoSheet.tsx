import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, FileSpreadsheet, Upload, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface ColumnDef { key: string; label: string; type?: string }
interface Props {
  hrUserId: string;
  employerUserId: string;
  employerName: string;
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

// Treat any column with key "resume" or label containing "resume"/"cv" as a resume upload field
const isResumeColumn = (c: ColumnDef) =>
  c.type === "resume" ||
  c.key.toLowerCase() === "resume" ||
  /resume|cv/i.test(c.label);

export default function HRCandidateInfoSheet({ hrUserId, employerUserId, employerName }: Props) {
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [uploadingCell, setUploadingCell] = useState<string | null>(null);

  const handleResumeUpload = async (idx: number, key: string, file: File) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const allowed = [".pdf", ".doc", ".docx"];
    if (!allowed.some(ext => lower.endsWith(ext))) {
      toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10 MB).");
      return;
    }
    const cellId = `${idx}-${key}`;
    setUploadingCell(cellId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${hrUserId}/hr-sheet/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
      updateCell(idx, key, urlData.publicUrl);
      toast.success("Resume uploaded");
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || "unknown"));
    } finally {
      setUploadingCell(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: colData }, { data: sheetData }] = await Promise.all([
        supabase.from("employer_hr_sheet_columns").select("columns").eq("employer_user_id", employerUserId).maybeSingle(),
        supabase.from("hr_candidate_sheets").select("rows, updated_at").eq("hr_user_id", hrUserId).eq("employer_user_id", employerUserId).maybeSingle(),
      ]);
      if (colData?.columns && Array.isArray(colData.columns)) {
        let loaded = colData.columns as unknown as ColumnDef[];
        const hasResume = loaded.some(isResumeColumn);
        if (!hasResume) {
          loaded = [...loaded, { key: "resume", label: "Resume", type: "resume" }];
        } else {
          loaded = loaded.map(c => isResumeColumn(c) ? { ...c, type: "resume" } : c);
        }
        setColumns(loaded);
      }
      if (sheetData?.rows && Array.isArray(sheetData.rows)) {
        setRows(sheetData.rows as unknown as Record<string, string>[]);
        setLastSavedAt(sheetData.updated_at);
      }
      setLoading(false);
    };
    load();
  }, [hrUserId, employerUserId]);

  const emptyRow = useMemo(() => Object.fromEntries(columns.map(c => [c.key, ""])), [columns]);

  const addRow = () => setRows(r => [...r, { ...emptyRow }]);
  const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));
  const updateCell = (idx: number, key: string, val: string) =>
    setRows(r => r.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("hr_candidate_sheets")
      .upsert({
        hr_user_id: hrUserId,
        employer_user_id: employerUserId,
        rows: rows as any,
      }, { onConflict: "hr_user_id,employer_user_id" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Sheet saved — visible to your Employer");
      setLastSavedAt(new Date().toISOString());
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading sheet…</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Candidate Info Sheet
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Fill candidate details below. Visible to <span className="font-medium">{employerName}</span> after save.
            {lastSavedAt && <> · Last saved {new Date(lastSavedAt).toLocaleString()}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3.5 w-3.5 mr-1" />Add Row</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto border rounded-md">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left w-10">#</th>
                {columns.map(c => (
                  <th key={c.key} className="p-2 text-left font-medium whitespace-nowrap min-w-[180px]">{c.label}</th>
                ))}
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="p-6 text-center text-muted-foreground">No rows yet. Click "Add Row" to start.</td></tr>
              ) : rows.map((row, idx) => (
                <tr key={idx} className="border-t align-top">
                  <td className="p-1 text-muted-foreground text-center pt-2">{idx + 1}</td>
                  {columns.map(c => {
                    const cellId = `${idx}-${c.key}`;
                    const value = row[c.key] ?? "";
                    if (isResumeColumn(c)) {
                      const hasFile = !!value && /^https?:\/\//i.test(value);
                      return (
                        <td key={c.key} className="p-1 min-w-[180px]">
                          {hasFile ? (
                            <div className="flex items-center gap-1">
                              <a
                                href={value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1.5 border rounded-md bg-background truncate"
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">View Resume</span>
                              </a>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => updateCell(idx, c.key, "")}
                                title="Remove resume"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-1 text-xs cursor-pointer px-2 py-1.5 border border-dashed rounded-md hover:bg-muted/50 transition">
                              {uploadingCell === cellId ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                              ) : (
                                <><Upload className="h-3.5 w-3.5" /> Upload PDF/DOC</>
                              )}
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                disabled={uploadingCell === cellId}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleResumeUpload(idx, c.key, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td key={c.key} className="p-1 min-w-[180px]">
                        <textarea
                          className="w-full min-h-[36px] text-xs rounded-md border border-input bg-background px-2 py-1.5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y whitespace-pre-wrap break-words"
                          rows={1}
                          value={value}
                          onChange={e => {
                            updateCell(idx, c.key, e.target.value);
                            const t = e.target as HTMLTextAreaElement;
                            t.style.height = "auto";
                            t.style.height = t.scrollHeight + "px";
                          }}
                          ref={(el) => {
                            if (el) {
                              el.style.height = "auto";
                              el.style.height = el.scrollHeight + "px";
                            }
                          }}
                        />
                      </td>
                    );
                  })}
                  <td className="p-1">
                    <Button size="icon" variant="ghost" onClick={() => removeRow(idx)} className="h-7 w-7">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Columns are defined by your Employer. Contact them to add or rename fields.
        </p>
      </CardContent>
    </Card>
  );
}
