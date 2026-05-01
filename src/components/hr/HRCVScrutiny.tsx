import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Upload, Loader2, FileText, Trophy, ScanSearch, Trash2, Download,
} from "lucide-react";
import { toast } from "sonner";

interface JobLite {
  id: string;
  job_title: string;
  description?: string | null;
  requirements?: string | null;
  status?: string | null;
}

interface Match {
  jobId: string;
  jobTitle: string;
  score: number;
  reason: string;
}

interface ResumeRow {
  id: string;
  fileName: string;
  resumeUrl?: string;
  uploading: boolean;
  scanning: boolean;
  scannedCount: number;
  totalToScan: number;
  matches: Match[];
  error?: string;
}

interface Props {
  hrUserId: string;
  employerUserId: string;
  employerName: string;
}

export default function HRCVScrutiny({ hrUserId, employerUserId, employerName }: Props) {
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [rows, setRows] = useState<ResumeRow[]>([]);
  const [bulkScanning, setBulkScanning] = useState(false);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState("by-resume");

  useEffect(() => {
    (async () => {
      setLoadingJobs(true);
      const { data } = await supabase
        .from("jobs")
        .select("id, job_title, description, requirements, status")
        .eq("employer_id", employerUserId)
        .order("created_at", { ascending: false });
      setJobs((data ?? []) as JobLite[]);
      setLoadingJobs(false);
    })();
  }, [employerUserId]);

  const activeJobs = useMemo(
    () => jobs.filter(j => {
      const s = (j.status || "").toLowerCase();
      return s === "active" || s === "approved" || s === "open";
    }),
    [jobs]
  );

  const targetJobs = activeJobs.length ? activeJobs : jobs;

  const scoreTone = (n: number) =>
    n >= 75 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
    n >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
              "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";

  const uploadOne = async (file: File): Promise<{ url: string; name: string } | null> => {
    const lower = file.name.toLowerCase();
    if (![".pdf", ".doc", ".docx"].some(ext => lower.endsWith(ext))) {
      toast.error(`${file.name}: Only PDF/DOC/DOCX allowed.`);
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name}: Too large (max 10 MB).`);
      return null;
    }
    const ext = file.name.split(".").pop();
    const path = `${hrUserId}/cv-scrutiny/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(`${file.name}: upload failed`);
      return null;
    }
    const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name };
  };

  const scanRow = async (rowId: string, rowOverride?: Pick<ResumeRow, "resumeUrl" | "fileName">) => {
    const row = rowOverride?.resumeUrl ? rowOverride : rows.find(r => r.id === rowId);
    if (!row?.resumeUrl) return;
    if (targetJobs.length === 0) {
      toast.error("No vacancies available to scan against.");
      return;
    }
    setRows(prev => prev.map(r => r.id === rowId
      ? { ...r, scanning: true, matches: [], scannedCount: 0, totalToScan: targetJobs.length, error: undefined }
      : r));

    const matches: Match[] = [];
    let lastError = "";
    for (const job of targetJobs) {
      const jobContext = `Employer: ${employerName}
Job Title: ${job.job_title}
Description: ${(job.description || "").slice(0, 1500)}
Requirements: ${(job.requirements || "").slice(0, 1500)}`;
      try {
        const { data, error } = await supabase.functions.invoke("score-resume-match", {
          body: { resumeUrl: row.resumeUrl, jobContext, candidateRow: { fileName: row.fileName } },
        });
        if (!error && !data?.error) {
          const score = Math.max(0, Math.min(100, parseInt(String(data?.score ?? 0), 10) || 0));
          matches.push({ jobId: job.id, jobTitle: job.job_title, score, reason: String(data?.reason || "") });
        } else {
          lastError = String(data?.error || error?.message || "Scan failed");
          console.error("score-resume-match error", error || data?.error);
        }
      } catch (e: any) {
        lastError = e?.message || "Scan failed";
        console.error("scan error", e);
      }
      const sorted = [...matches].sort((a, b) => b.score - a.score);
      setRows(prev => prev.map(r => r.id === rowId
        ? { ...r, matches: sorted, scannedCount: matches.length }
        : r));
    }

    setRows(prev => prev.map(r => r.id === rowId
      ? { ...r, scanning: false, error: matches.length ? undefined : lastError || "Scan failed. Please retry with a PDF or DOCX resume." }
      : r));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (targetJobs.length === 0) {
      toast.error("Post at least one vacancy before scrutinizing CVs.");
      return;
    }
    const arr = Array.from(files);
    const placeholders: ResumeRow[] = arr.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: f.name,
      uploading: true,
      scanning: false,
      scannedCount: 0,
      totalToScan: targetJobs.length,
      matches: [],
    }));
    setRows(prev => [...placeholders, ...prev]);

    const uploaded = await Promise.all(arr.map(async (f, i) => {
      const out = await uploadOne(f);
      const id = placeholders[i].id;
      if (!out) {
        setRows(prev => prev.map(r => r.id === id ? { ...r, uploading: false, error: "Upload failed" } : r));
        return null;
      }
      setRows(prev => prev.map(r => r.id === id ? { ...r, uploading: false, resumeUrl: out.url } : r));
      return { id, url: out.url, name: out.name };
    }));

    const ok = uploaded.filter(Boolean) as { id: string; url: string; name: string }[];
    if (ok.length === 0) return;

    setBulkScanning(true);
    for (const u of ok) {
      await scanRow(u.id, { resumeUrl: u.url, fileName: u.name });
    }
    setBulkScanning(false);
    toast.success(`CV Scrutiny complete (${ok.length} resume${ok.length > 1 ? "s" : ""} × ${targetJobs.length} vacancies)`);
  };

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const clearAll = () => setRows([]);

  // ---- Aggregations ----
  const filteredRows = rows.filter(r =>
    !filter.trim() || r.fileName.toLowerCase().includes(filter.trim().toLowerCase())
  );

  // Per-vacancy leaderboard: { jobId, jobTitle, ranked: [{rowId, fileName, score, reason}] }
  const byVacancy = useMemo(() => {
    const map = new Map<string, { jobId: string; jobTitle: string; ranked: { rowId: string; fileName: string; score: number; reason: string }[] }>();
    for (const r of rows) {
      for (const m of r.matches) {
        if (!map.has(m.jobId)) map.set(m.jobId, { jobId: m.jobId, jobTitle: m.jobTitle, ranked: [] });
        map.get(m.jobId)!.ranked.push({ rowId: r.id, fileName: r.fileName, score: m.score, reason: m.reason });
      }
    }
    const arr = Array.from(map.values());
    arr.forEach(v => v.ranked.sort((a, b) => b.score - a.score));
    return arr;
  }, [rows]);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = ["Resume", "Best Vacancy", "Best Score", ...targetJobs.map(j => j.job_title)];
    const lines = [header.join(",")];
    for (const r of rows) {
      const best = r.matches[0];
      const row = [
        `"${r.fileName.replace(/"/g, '""')}"`,
        best ? `"${best.jobTitle.replace(/"/g, '""')}"` : "",
        best ? String(best.score) : "",
        ...targetJobs.map(j => {
          const m = r.matches.find(x => x.jobId === j.id);
          return m ? String(m.score) : "";
        }),
      ];
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-scrutiny-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-primary" /> CV Scrutiny — Bulk Resume Matching
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Upload many resumes at once. AI scans each CV against every open vacancy and tells you which resume suits which vacancy.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Upload resumes (bulk supported)</span>
              <label className="inline-flex items-center justify-center gap-2 text-sm cursor-pointer px-3 py-2 border border-dashed rounded-md hover:bg-muted/50 transition">
                <Upload className="h-4 w-4" /> Click to upload PDF/DOC/DOCX (multi-select)
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,application/pdf"
                  className="hidden"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
                />
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Vacancies in scope</span>
              <div className="border rounded-md px-3 py-2 text-sm bg-muted/30 h-9 flex items-center">
                {loadingJobs ? "Loading…" : `${targetJobs.length} ${activeJobs.length ? "active" : "total"} vacancy${targetJobs.length === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>

          {targetJobs.length === 0 && !loadingJobs && (
            <div className="text-xs text-muted-foreground bg-muted/30 border border-dashed rounded-md p-3">
              Your employer has no vacancies yet. Post a job before running CV Scrutiny.
            </div>
          )}
          {bulkScanning && (
            <div className="text-xs text-primary flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scrutinizing CVs against vacancies…
            </div>
          )}

          {rows.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <Input
                placeholder="Filter by file name…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 text-xs max-w-xs"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportCsv}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={clearAll}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <ScanSearch className="h-8 w-8 mx-auto opacity-40" />
            <p>No resumes uploaded yet. Upload to start CV Scrutiny.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="by-resume" className="text-xs">By Resume ({rows.length})</TabsTrigger>
            <TabsTrigger value="by-vacancy" className="text-xs">By Vacancy ({byVacancy.length})</TabsTrigger>
          </TabsList>

          {/* By Resume */}
          <TabsContent value="by-resume">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Resume</TableHead>
                      <TableHead className="text-xs">Best-suited Vacancy</TableHead>
                      <TableHead className="text-xs">Score</TableHead>
                      <TableHead className="text-xs">Top 3 Matches</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map(r => {
                      const best = r.matches[0];
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[200px]" title={r.fileName}>{r.fileName}</span>
                              {r.uploading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {best ? (
                              <span className="flex items-center gap-1 font-medium">
                                <Trophy className="h-3 w-3 text-amber-500" /> {best.jobTitle}
                              </span>
                            ) : r.scanning ? (
                              <span className="text-muted-foreground italic">Scanning…</span>
                            ) : r.error ? (
                              <span className="text-destructive">{r.error}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {best ? (
                              <Badge className={`${scoreTone(best.score)} text-[11px]`} variant="secondary">{best.score}%</Badge>
                            ) : r.scanning ? (
                              <span className="text-[11px] text-muted-foreground">{r.scannedCount}/{r.totalToScan}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {r.matches.slice(0, 3).map(m => (
                                <Badge
                                  key={m.jobId}
                                  variant="outline"
                                  className="text-[10px] gap-1"
                                  title={m.reason}
                                >
                                  <span className={`px-1 rounded ${scoreTone(m.score)}`}>{m.score}%</span>
                                  <span className="truncate max-w-[120px]">{m.jobTitle}</span>
                                </Badge>
                              ))}
                              {r.scanning && r.matches.length > 0 && (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground self-center" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {r.resumeUrl && (
                                <a href={r.resumeUrl} target="_blank" rel="noopener noreferrer"
                                   className="text-[11px] text-primary hover:underline px-1">
                                  View
                                </a>
                              )}
                              {r.resumeUrl && !r.scanning && !r.uploading && (
                                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => scanRow(r.id)}>
                                  Re-scan
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(r.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Vacancy */}
          <TabsContent value="by-vacancy">
            <div className="space-y-3">
              {byVacancy.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No matches yet.</CardContent></Card>
              ) : byVacancy.map(v => (
                <Card key={v.jobId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      {v.jobTitle}
                      <Badge variant="outline" className="text-[10px] ml-1">{v.ranked.length} candidate{v.ranked.length !== 1 ? "s" : ""}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    {v.ranked.map((c, i) => (
                      <div key={c.rowId} className="flex items-center gap-2 text-xs border border-border rounded-md px-2 py-1.5">
                        <span className="text-muted-foreground w-5">{i + 1}.</span>
                        <Badge className={`${scoreTone(c.score)} font-semibold w-12 justify-center`} variant="secondary">{c.score}%</Badge>
                        <span className="font-medium truncate flex-1" title={c.fileName}>{c.fileName}</span>
                        {c.reason && (
                          <span className="text-muted-foreground hidden md:inline truncate max-w-[45%]" title={c.reason}>
                            {c.reason}
                          </span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
