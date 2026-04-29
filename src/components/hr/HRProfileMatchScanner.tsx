import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Upload, Loader2, FileText, X, Sparkles, Trophy, Search,
} from "lucide-react";
import { toast } from "sonner";

interface JobLite {
  id: string;
  job_title: string;
  description?: string | null;
  requirements?: string | null;
  status?: string | null;
}

interface ScanRow {
  id: string;             // local id
  fileName: string;
  resumeUrl?: string;
  uploading: boolean;
  scanning: boolean;
  results: { jobId: string; jobTitle: string; score: number; reason: string }[];
  bestScore?: number;
  bestJobTitle?: string;
  error?: string;
}

interface Props {
  hrUserId: string;
  employerUserId: string;
  employerName: string;
}

export default function HRProfileMatchScanner({ hrUserId, employerUserId, employerName }: Props) {
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string>("__all__");
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [bulkScanning, setBulkScanning] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingJobs(true);
      const { data } = await supabase
        .from("jobs")
        .select("id, job_title, description, requirements, status")
        .eq("employer_id", employerUserId)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as JobLite[];
      // Prefer active jobs first
      list.sort((a, b) => {
        const sa = (a.status || "").toLowerCase();
        const sb = (b.status || "").toLowerCase();
        const aActive = sa === "active" || sa === "approved" || sa === "open" ? 0 : 1;
        const bActive = sb === "active" || sb === "approved" || sb === "open" ? 0 : 1;
        return aActive - bActive;
      });
      setJobs(list);
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

  const targetJobs = selectedJobId === "__all__"
    ? (activeJobs.length ? activeJobs : jobs)
    : jobs.filter(j => j.id === selectedJobId);

  const scoreToTone = (n: number) =>
    n >= 75 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
    n >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
              "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";

  const uploadOne = async (file: File): Promise<{ url: string; name: string } | null> => {
    const lower = file.name.toLowerCase();
    const allowed = [".pdf", ".doc", ".docx"];
    if (!allowed.some(ext => lower.endsWith(ext))) {
      toast.error(`${file.name}: Only PDF/DOC/DOCX allowed.`);
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name}: Too large (max 10 MB).`);
      return null;
    }
    const ext = file.name.split(".").pop();
    const path = `${hrUserId}/profile-match/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(`${file.name}: upload failed`);
      return null;
    }
    const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name };
  };

  const scanRow = async (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row?.resumeUrl) return;
    if (targetJobs.length === 0) {
      toast.error("No jobs available to scan against.");
      return;
    }
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, scanning: true, results: [], error: undefined } : r));

    const results: ScanRow["results"] = [];
    for (const job of targetJobs) {
      const jobContext = `Employer: ${employerName}
Job Title: ${job.job_title}
Description: ${(job.description || "").slice(0, 1500)}
Requirements: ${(job.requirements || "").slice(0, 1500)}`;
      try {
        const { data, error } = await supabase.functions.invoke("score-resume-match", {
          body: { resumeUrl: row.resumeUrl, jobContext, candidateRow: { fileName: row.fileName } },
        });
        if (error || data?.error) {
          console.error("score-resume-match error", error || data?.error);
          continue;
        }
        const score = Math.max(0, Math.min(100, parseInt(String(data?.score ?? 0), 10) || 0));
        results.push({ jobId: job.id, jobTitle: job.job_title, score, reason: String(data?.reason || "") });
        // Live update so user sees progress
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, results: [...results].sort((a, b) => b.score - a.score) } : r));
      } catch (e: any) {
        console.error(e);
      }
    }

    const sorted = [...results].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    setRows(prev => prev.map(r => r.id === rowId
      ? { ...r, scanning: false, results: sorted, bestScore: best?.score, bestJobTitle: best?.jobTitle }
      : r));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    // Create placeholder rows
    const placeholders: ScanRow[] = arr.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: f.name,
      uploading: true,
      scanning: false,
      results: [],
    }));
    setRows(prev => [...placeholders, ...prev]);

    // Upload all in parallel
    const uploaded = await Promise.all(arr.map(async (f, i) => {
      const out = await uploadOne(f);
      const id = placeholders[i].id;
      if (!out) {
        setRows(prev => prev.map(r => r.id === id ? { ...r, uploading: false, error: "Upload failed" } : r));
        return null;
      }
      setRows(prev => prev.map(r => r.id === id ? { ...r, uploading: false, resumeUrl: out.url } : r));
      return { id, url: out.url };
    }));

    const ok = uploaded.filter(Boolean) as { id: string; url: string }[];
    if (ok.length === 0) return;

    // Scan: if multiple, treat as bulk and run sequentially per-file (each file scans all target jobs)
    if (ok.length === 1) {
      await scanRow(ok[0].id);
    } else {
      setBulkScanning(true);
      for (const u of ok) {
        await scanRow(u.id);
      }
      setBulkScanning(false);
      toast.success(`Bulk scan complete (${ok.length} resumes)`);
    }
  };

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Profile Match Scanner
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Upload one or multiple resumes — AI compares each against your employer's jobs and ranks the best fit.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Scan against</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId} disabled={loadingJobs || jobs.length === 0}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={loadingJobs ? "Loading jobs…" : "Select a job"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    All active jobs ({activeJobs.length || jobs.length})
                  </SelectItem>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_title} {j.status ? <span className="text-muted-foreground">· {j.status}</span> : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Upload resumes</span>
              <div className="flex gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-2 text-sm cursor-pointer px-3 py-2 border border-dashed rounded-md hover:bg-muted/50 transition">
                  <Upload className="h-4 w-4" /> Single
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    className="hidden"
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
                  />
                </label>
                <label className="flex-1 inline-flex items-center justify-center gap-2 text-sm cursor-pointer px-3 py-2 border border-dashed rounded-md hover:bg-muted/50 transition">
                  <Upload className="h-4 w-4" /> Bulk
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,application/pdf"
                    className="hidden"
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
                  />
                </label>
              </div>
            </div>
          </div>

          {jobs.length === 0 && !loadingJobs && (
            <div className="text-xs text-muted-foreground bg-muted/30 border border-dashed rounded-md p-3">
              Your employer has no jobs yet — ask them to post one before running profile match scans.
            </div>
          )}
          {bulkScanning && (
            <div className="text-xs text-primary flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Bulk scanning in progress…
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <Search className="h-8 w-8 mx-auto opacity-40" />
            <p>No scans yet. Upload a resume to compute the profile match percentage against your jobs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{r.fileName}</span>
                    {r.uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </CardTitle>
                  {r.bestScore !== undefined && r.bestJobTitle && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-amber-500" />
                      Best match: <span className="font-medium text-foreground">{r.bestJobTitle}</span>
                      <Badge className={`text-[11px] ml-1 ${scoreToTone(r.bestScore)}`} variant="secondary">{r.bestScore}%</Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {r.resumeUrl && (
                    <a
                      href={r.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline px-2"
                    >
                      View
                    </a>
                  )}
                  {r.resumeUrl && !r.scanning && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => scanRow(r.id)}>
                      <Sparkles className="h-3 w-3 mr-1" /> Re-scan
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(r.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {r.error ? (
                  <p className="text-xs text-destructive">{r.error}</p>
                ) : r.scanning && r.results.length === 0 ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning against {targetJobs.length} job{targetJobs.length !== 1 ? "s" : ""}…
                  </div>
                ) : r.results.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Waiting…</p>
                ) : (
                  <div className="space-y-1.5">
                    {r.results.map(res => (
                      <div key={res.jobId} className="flex items-center gap-2 text-xs">
                        <Badge className={`${scoreToTone(res.score)} font-semibold w-12 justify-center`} variant="secondary">
                          {res.score}%
                        </Badge>
                        <span className="font-medium truncate flex-1">{res.jobTitle}</span>
                        {res.reason && (
                          <span className="text-muted-foreground hidden md:inline truncate max-w-[40%]" title={res.reason}>
                            {res.reason}
                          </span>
                        )}
                      </div>
                    ))}
                    {r.scanning && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Still scanning more jobs…
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
