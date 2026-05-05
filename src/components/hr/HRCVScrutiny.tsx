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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload, Loader2, FileText, Trophy, ScanSearch, Trash2, Download, Mail, Send, RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { upsertEmailRecord } from "@/lib/hrEmailStatusStore";

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
  candidateName?: string;
  candidateEmail?: string;
  parsing?: boolean;
  emailStatus?: "sending" | "sent" | "failed";
  emailError?: string;
  emailSentAt?: string;
}

const getScanErrorMessage = async (error?: { message?: string; context?: unknown } | null, data?: { error?: string } | null) => {
  let contextMessage = "";
  if (error?.context instanceof Response) {
    try {
      const body = await error.context.clone().json();
      contextMessage = String(body?.error || "");
    } catch {
      contextMessage = await error.context.clone().text().catch(() => "");
    }
  } else if (typeof error?.context === "object" && error.context !== null && "error" in error.context) {
    contextMessage = String((error.context as { error?: string }).error || "");
  }
  const raw = String(data?.error || contextMessage || error?.message || "Scan failed");
  if (raw.includes("AI credits exhausted") || raw.includes("Payment Required") || raw.includes("402")) {
    return "AI credits exhausted. Add AI balance, then Re-scan.";
  }
  if (raw.includes("Rate limited") || raw.includes("429")) {
    return "AI is busy. Wait a minute, then Re-scan.";
  }
  if (raw.includes("non-2xx") || raw.includes("FunctionsHttpError")) {
    return "Scan service failed. Please click Re-scan.";
  }
  return raw;
};

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

  // Email composer state
  const [mailOpen, setMailOpen] = useState(false);
  const [mailRowIds, setMailRowIds] = useState<string[]>([]);
  const [mailSubject, setMailSubject] = useState(
    `Update on your application — {{job}} at {{company}}`
  );
  const [mailBody, setMailBody] = useState(
    `Hi {{name}},\n\nThank you for sharing your resume with {{company}}. After reviewing your profile against our open vacancy "{{job}}", your AI-match score is {{score}}%.\n\nWe'd like to take your candidature forward. Our team will reach out shortly with the next steps.\n\nBest regards,\n{{company}} Hiring Team`
  );
  const [mailPreviewIndex, setMailPreviewIndex] = useState(0);
  const [mailSending, setMailSending] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingJobs(true);
      let q = supabase
        .from("jobs")
        .select("id, job_title, description, requirements, status")
        .order("created_at", { ascending: false });
      if (employerUserId) q = q.eq("employer_id", employerUserId);
      const { data } = await q.limit(200);
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

  // Cap the number of vacancies each resume is scored against so bulk uploads
  // finish in a reasonable time (otherwise N resumes × M jobs sequential AI
  // calls makes the UI appear to "hang" after upload).
  const MAX_JOBS_PER_SCAN = 15;
  const targetJobs = (activeJobs.length ? activeJobs : jobs).slice(0, MAX_JOBS_PER_SCAN);

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
          lastError = await getScanErrorMessage(error, data);
          console.error("score-resume-match error", error || data?.error);
        }
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : "Scan failed";
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

  // Quick parse to extract candidate name + email for mailing
  const parseRow = async (rowId: string, file: File) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, parsing: true } : r));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-resume", { body: fd });
      if (error || data?.error) {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, parsing: false } : r));
        return;
      }
      const name = String(data?.full_name || "").trim();
      const email = String(data?.email || "").trim().toLowerCase();
      setRows(prev => prev.map(r => r.id === rowId
        ? { ...r, parsing: false, candidateName: name || r.candidateName, candidateEmail: email || r.candidateEmail }
        : r));
    } catch {
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, parsing: false } : r));
    }
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
      // Parse for email/name in background (non-blocking)
      parseRow(id, f).catch(() => {});
      return { id, url: out.url, name: out.name };
    }));

    const ok = uploaded.filter(Boolean) as { id: string; url: string; name: string }[];
    if (ok.length === 0) return;
    toast.success(`${ok.length} resume${ok.length > 1 ? "s" : ""} uploaded. Scanning now…`);
    for (const u of ok) {
      await scanRow(u.id, { resumeUrl: u.url, fileName: u.name });
    }
  };

  const scanAll = async () => {
    const pending = rows.filter(r => r.resumeUrl && !r.scanning && !r.uploading && r.matches.length === 0);
    if (pending.length === 0) {
      toast.info("No unscanned resumes to process.");
      return;
    }
    if (targetJobs.length === 0) {
      toast.error("No vacancies available to scan against.");
      return;
    }
    setBulkScanning(true);
    const CONCURRENCY = 3;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (cursor < pending.length) {
        const u = pending[cursor++];
        try {
          await scanRow(u.id, { resumeUrl: u.resumeUrl!, fileName: u.fileName });
        } catch (e) {
          console.error("scanRow failed", e);
        }
      }
    });
    await Promise.all(workers);
    setBulkScanning(false);
    toast.success(`CV Scrutiny complete (${pending.length} resume${pending.length > 1 ? "s" : ""} × ${targetJobs.length} vacancies)`);
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

  const exportExcel = async () => {
    if (rows.length === 0) return;
    const XLSX = await import("xlsx");
    const header = ["Resume", "Best Vacancy", "Best Score", ...targetJobs.map(j => j.job_title)];
    const data: (string | number)[][] = [header];
    for (const r of rows) {
      const best = r.matches[0];
      data.push([
        r.fileName,
        best ? best.jobTitle : "",
        best ? best.score : "",
        ...targetJobs.map(j => {
          const m = r.matches.find(x => x.jobId === j.id);
          return m ? m.score : "";
        }),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CV Scrutiny");
    XLSX.writeFile(wb, `cv-scrutiny-${Date.now()}.xlsx`);
  };

  // ---- Email composer helpers ----
  const mailableRows = useMemo(
    () => rows.filter(r => r.matches.length > 0 && r.candidateEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.candidateEmail)),
    [rows]
  );

  const openMailFor = (rowIds: string[]) => {
    const valid = rowIds.filter(id => mailableRows.find(r => r.id === id));
    if (valid.length === 0) {
      toast.error("No scanned candidates with valid email yet. Wait for parsing to complete.");
      return;
    }
    setMailRowIds(valid);
    setMailPreviewIndex(0);
    setMailOpen(true);
  };

  const openMailAll = () => openMailFor(mailableRows.map(r => r.id));

  const buildRecipient = (r: ResumeRow) => {
    const best = r.matches[0];
    return {
      email: r.candidateEmail!,
      name: r.candidateName || r.fileName.replace(/\.[^.]+$/, ""),
      jobTitle: best?.jobTitle || "",
      score: best?.score ?? 0,
      fileName: r.fileName,
    };
  };

  const applyTokens = (s: string, r: ResumeRow) => {
    const rec = buildRecipient(r);
    return s
      .split("{{name}}").join(rec.name)
      .split("{{job}}").join(rec.jobTitle)
      .split("{{score}}").join(String(rec.score))
      .split("{{company}}").join(employerName || "")
      .split("{{file}}").join(rec.fileName);
  };

  // Core sender — used by initial send AND retry. Updates per-row status live.
  const dispatchEmails = async (
    rowIds: string[],
    opts: { closeDialog?: boolean; subject?: string; body?: string } = {},
  ): Promise<{ sent: number; total: number } | null> => {
    const subject = opts.subject ?? mailSubject;
    const body = opts.body ?? mailBody;
    const targetIds = rowIds.filter(id => {
      const r = rows.find(x => x.id === id);
      return r && r.candidateEmail;
    });
    const recips = targetIds
      .map(id => rows.find(r => r.id === id)!)
      .map(buildRecipient);
    if (recips.length === 0) {
      toast.error("No valid recipients.");
      return null;
    }
    setMailSending(true);
    setRows(prev => prev.map(r => targetIds.includes(r.id)
      ? { ...r, emailStatus: "sending", emailError: undefined }
      : r));
    try {
      const { data, error } = await supabase.functions.invoke("send-cv-scrutiny-email", {
        body: {
          recipients: recips,
          subject,
          htmlBody: body,
          fromName: employerName,
        },
      });
      if (error) throw error;
      const results: { email: string; status: "sent" | "failed"; error?: string }[] = Array.isArray(data?.results) ? data.results : [];
      const now = new Date().toISOString();
      setRows(prev => prev.map(r => {
        if (!targetIds.includes(r.id)) return r;
        const match = results.find(x => x.email?.toLowerCase() === (r.candidateEmail || "").toLowerCase());
        const recipient = recips.find(x => x.email.toLowerCase() === (r.candidateEmail || "").toLowerCase());
        const baseRec = {
          rowId: r.id,
          candidateName: recipient?.name || r.candidateName || r.fileName,
          candidateEmail: r.candidateEmail || "",
          fileName: r.fileName,
          jobTitle: recipient?.jobTitle || r.matches[0]?.jobTitle || "",
          score: r.matches[0]?.score ?? null,
          subject,
          sentAt: now,
        };
        if (!match) {
          upsertEmailRecord({ ...baseRec, status: "failed", error: "No response from server" });
          return { ...r, emailStatus: "failed", emailError: "No response from server" };
        }
        if (match.status === "sent") {
          upsertEmailRecord({ ...baseRec, status: "sent" });
          return { ...r, emailStatus: "sent", emailSentAt: now, emailError: undefined };
        }
        upsertEmailRecord({ ...baseRec, status: "failed", error: match.error || "Send failed" });
        return { ...r, emailStatus: "failed", emailError: match.error || "Send failed" };
      }));
      const sent = Number(data?.sent || 0);
      const total = Number(data?.total || recips.length);
      if (opts.closeDialog) setMailOpen(false);
      return { sent, total };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send emails.";
      const now = new Date().toISOString();
      setRows(prev => prev.map(r => {
        if (!targetIds.includes(r.id)) return r;
        if (r.candidateEmail) {
          upsertEmailRecord({
            rowId: r.id,
            candidateName: r.candidateName || r.fileName,
            candidateEmail: r.candidateEmail,
            fileName: r.fileName,
            jobTitle: r.matches[0]?.jobTitle || "",
            score: r.matches[0]?.score ?? null,
            subject,
            sentAt: now,
            status: "failed",
            error: msg,
          });
        }
        return { ...r, emailStatus: "failed", emailError: msg };
      }));
      toast.error(msg);
      return null;
    } finally {
      setMailSending(false);
    }
  };

  const sendMails = async () => {
    const res = await dispatchEmails(mailRowIds, { closeDialog: true });
    if (!res) return;
    const { sent, total } = res;
    if (sent === total) toast.success(`Sent ${sent} email${sent !== 1 ? "s" : ""}.`);
    else if (sent > 0) toast.warning(`Sent ${sent}/${total}. Some failed — see status column.`);
    else toast.error("Failed to send emails. See status column for details.");
  };

  // Retry only rows that previously failed
  const failedRows = useMemo(
    () => rows.filter(r => r.emailStatus === "failed" && r.candidateEmail),
    [rows]
  );

  const retryFailed = async () => {
    if (failedRows.length === 0) {
      toast.info("No failed emails to retry.");
      return;
    }
    const ids = failedRows.map(r => r.id);
    toast.info(`Retrying ${ids.length} failed email${ids.length !== 1 ? "s" : ""}…`);
    const res = await dispatchEmails(ids);
    if (!res) return;
    const { sent, total } = res;
    if (sent === total) toast.success(`Retry succeeded for all ${sent} candidate${sent !== 1 ? "s" : ""}.`);
    else if (sent > 0) toast.warning(`Retry: ${sent}/${total} sent. ${total - sent} still failing.`);
    else toast.error("Retry failed for all candidates. See status column.");
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
                {loadingJobs
                  ? "Loading…"
                  : `${targetJobs.length} ${activeJobs.length ? "active" : "total"} vacancy${targetJobs.length === 1 ? "" : "s"}${(activeJobs.length || jobs.length) > targetJobs.length ? ` (of ${activeJobs.length || jobs.length})` : ""}`}
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
              <Button
                size="sm"
                className="h-8 text-xs ml-auto"
                onClick={scanAll}
                disabled={bulkScanning || rows.every(r => r.uploading || r.scanning || r.matches.length > 0)}
              >
                {bulkScanning ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Scanning…</>
                ) : (
                  <><ScanSearch className="h-3.5 w-3.5 mr-1" /> Scan All ({rows.filter(r => r.resumeUrl && r.matches.length === 0 && !r.scanning).length})</>
                )}
              </Button>
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs"
                onClick={openMailAll}
                disabled={mailableRows.length === 0}
                title={mailableRows.length === 0 ? "No scanned candidates with email yet" : `Send email to ${mailableRows.length} candidate(s)`}
              >
                <Mail className="h-3.5 w-3.5 mr-1" /> Send Email ({mailableRows.length})
              </Button>
              {failedRows.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={retryFailed}
                  disabled={mailSending}
                  title={`Retry ${failedRows.length} failed email${failedRows.length !== 1 ? "s" : ""}`}
                >
                  {mailSending ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Retrying…</>
                  ) : (
                    <><RotateCw className="h-3.5 w-3.5 mr-1" /> Retry Failed ({failedRows.length})</>
                  )}
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportExcel}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export Excel
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
                      <TableHead className="text-xs">Mail Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map(r => {
                      const best = r.matches[0];
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[200px] font-medium" title={r.fileName}>
                                  {r.candidateName || r.fileName}
                                </span>
                                {(r.uploading || r.parsing) && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                              </div>
                              {r.candidateEmail && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[220px] pl-5" title={r.candidateEmail}>
                                  {r.candidateEmail}
                                </span>
                              )}
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
                          <TableCell className="text-xs">
                            {!r.candidateEmail ? (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            ) : r.emailStatus === "sending" ? (
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Sending
                              </Badge>
                            ) : r.emailStatus === "sent" ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                title={r.emailSentAt ? `Sent ${new Date(r.emailSentAt).toLocaleString()}` : "Sent"}
                              >
                                ✓ Sent
                              </Badge>
                            ) : r.emailStatus === "failed" ? (
                              <div className="flex flex-col gap-0.5 max-w-[180px]">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 self-start"
                                  title={r.emailError || "Send failed"}
                                >
                                  ✗ Failed
                                </Badge>
                                {r.emailError && (
                                  <span className="text-[10px] text-destructive truncate" title={r.emailError}>
                                    {r.emailError}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Not sent</span>
                            )}
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
                              {r.matches.length > 0 && r.candidateEmail && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px] text-primary"
                                  onClick={() => openMailFor([r.id])}
                                  title={`Send email to ${r.candidateEmail}`}
                                >
                                  <Mail className="h-3.5 w-3.5 mr-0.5" /> Mail
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

      {/* Email composer dialog */}
      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Send Email to Candidate{mailRowIds.length > 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {mailRowIds.length} recipient{mailRowIds.length !== 1 ? "s" : ""}.
              Use tokens: <code className="text-[11px]">{"{{name}}"}</code>, <code className="text-[11px]">{"{{job}}"}</code>,
              <code className="text-[11px] ml-1">{"{{score}}"}</code>, <code className="text-[11px] ml-1">{"{{company}}"}</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Composer */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Subject</Label>
                <Input
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  className="h-9 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Body</Label>
                <Textarea
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  className="min-h-[260px] text-sm mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Recipients ({mailRowIds.length})</Label>
                <div className="border rounded-md p-2 max-h-[140px] overflow-y-auto space-y-1 mt-1 bg-muted/30">
                  {mailRowIds.map((id, i) => {
                    const r = rows.find(x => x.id === id);
                    if (!r) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMailPreviewIndex(i)}
                        className={`w-full text-left text-[11px] px-2 py-1 rounded ${i === mailPreviewIndex ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                      >
                        <span className="font-medium">{r.candidateName || r.fileName}</span>
                        <span className="text-muted-foreground ml-1">— {r.candidateEmail}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs">Live Preview</Label>
              {(() => {
                const r = rows.find(x => x.id === mailRowIds[mailPreviewIndex]);
                if (!r) return <div className="text-xs text-muted-foreground">No preview.</div>;
                return (
                  <div className="border rounded-md bg-background overflow-hidden">
                    <div className="px-3 py-2 border-b bg-muted/40 text-[11px]">
                      <div><span className="text-muted-foreground">To:</span> {r.candidateEmail}</div>
                      <div><span className="text-muted-foreground">Subject:</span> <span className="font-medium">{applyTokens(mailSubject, r)}</span></div>
                    </div>
                    <div className="p-3 text-xs whitespace-pre-wrap leading-relaxed max-h-[340px] overflow-y-auto">
                      {applyTokens(mailBody, r)}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMailOpen(false)} disabled={mailSending}>Cancel</Button>
            <Button onClick={sendMails} disabled={mailSending || mailRowIds.length === 0}>
              {mailSending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-3.5 w-3.5 mr-1" /> Send to {mailRowIds.length} candidate{mailRowIds.length !== 1 ? "s" : ""}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

