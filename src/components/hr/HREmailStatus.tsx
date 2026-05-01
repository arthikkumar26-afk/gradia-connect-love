import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Mail, CheckCircle2, XCircle, Loader2, RefreshCw, Trash2, Download, Search } from "lucide-react";
import {
  getEmailRecords,
  subscribeEmailRecords,
  clearEmailRecords,
  type HREmailRecord,
} from "@/lib/hrEmailStatusStore";
import { toast } from "sonner";

type StatusFilter = "all" | "sent" | "failed";

export default function HREmailStatus() {
  const [records, setRecords] = useState<HREmailRecord[]>(() => getEmailRecords());
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const unsub = subscribeEmailRecords(() => setRecords(getEmailRecords()));
    return unsub;
  }, []);

  const stats = useMemo(() => {
    const sent = records.filter(r => r.status === "sent").length;
    const failed = records.filter(r => r.status === "failed").length;
    const sending = records.filter(r => r.status === "sending").length;
    const uniqueCandidates = new Set(records.map(r => r.candidateEmail.toLowerCase())).size;
    return { sent, failed, sending, total: records.length, uniqueCandidates };
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records
      .filter(r => filter === "all" || r.status === filter)
      .filter(r => !q ||
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        r.jobTitle.toLowerCase().includes(q) ||
        r.fileName.toLowerCase().includes(q) ||
        (r.error || "").toLowerCase().includes(q));
  }, [records, filter, query]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const header = ["Candidate", "Email", "Job", "Score", "Subject", "Status", "Attempts", "Last Attempt", "Error", "Resume File"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const row = [
        r.candidateName, r.candidateEmail, r.jobTitle,
        r.score != null ? String(r.score) : "",
        r.subject, r.status, String(r.attempts),
        new Date(r.sentAt).toLocaleString(),
        r.error || "",
        r.fileName,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-status-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (records.length === 0) return;
    if (!confirm(`Clear all ${records.length} email log entries? This cannot be undone.`)) return;
    clearEmailRecords();
    toast.success("Email log cleared.");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Email Status — CV Scrutiny Send Log
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Detailed delivery status for every email sent from CV Scrutiny — including failures and retry history.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`text-left p-3 rounded-md border transition ${filter === "all" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
            >
              <p className="text-[11px] text-muted-foreground">Total Sends</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </button>
            <button
              onClick={() => setFilter("sent")}
              className={`text-left p-3 rounded-md border transition ${filter === "sent" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-border hover:bg-muted/40"}`}
            >
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Sent
              </p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.sent}</p>
            </button>
            <button
              onClick={() => setFilter("failed")}
              className={`text-left p-3 rounded-md border transition ${filter === "failed" ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/40"}`}
            >
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" /> Failed
              </p>
              <p className="text-xl font-bold text-destructive">{stats.failed}</p>
            </button>
            <div className="p-3 rounded-md border border-border">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3" /> In-flight
              </p>
              <p className="text-xl font-bold">{stats.sending}</p>
            </div>
            <div className="p-3 rounded-md border border-border">
              <p className="text-[11px] text-muted-foreground">Unique Candidates</p>
              <p className="text-xl font-bold">{stats.uniqueCandidates}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by candidate, email, job, or error…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 text-xs pl-7"
              />
            </div>
            <Badge variant="outline" className="text-[10px]">
              Showing {filtered.length} of {records.length}
            </Badge>
            <Button size="sm" variant="outline" className="h-8 text-xs ml-auto" onClick={() => setRecords(getEmailRecords())}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={handleClear} disabled={records.length === 0}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear log
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto opacity-40 mb-2" />
              {records.length === 0 ? (
                <p>No emails sent yet. Use <strong>CV Scrutiny → Send Email</strong> to start delivering.</p>
              ) : (
                <p>No entries match your current filter.</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Candidate</TableHead>
                  <TableHead className="text-xs">Job / Score</TableHead>
                  <TableHead className="text-xs">Subject</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Attempts</TableHead>
                  <TableHead className="text-xs">Last Attempt</TableHead>
                  <TableHead className="text-xs">Error Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium truncate max-w-[180px]" title={r.candidateName}>
                          {r.candidateName}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={r.candidateEmail}>
                          {r.candidateEmail}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 truncate max-w-[200px]" title={r.fileName}>
                          {r.fileName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium truncate max-w-[160px]" title={r.jobTitle}>
                          {r.jobTitle || "—"}
                        </span>
                        {r.score != null && (
                          <Badge variant="secondary" className="text-[10px] w-fit">
                            {r.score}% match
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="truncate max-w-[220px] inline-block" title={r.subject}>
                        {r.subject}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.status === "sent" ? (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" variant="secondary">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Sent
                        </Badge>
                      ) : r.status === "failed" ? (
                        <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" variant="secondary">
                          <XCircle className="h-3 w-3 mr-0.5" /> Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          <Loader2 className="h-3 w-3 mr-0.5 animate-spin" /> Sending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.attempts > 1 ? (
                        <Badge variant="outline" className="text-[10px]">{r.attempts}×</Badge>
                      ) : (
                        <span className="text-muted-foreground">1×</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.sentAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.error ? (
                        <span className="text-destructive break-words max-w-[260px] inline-block" title={r.error}>
                          {r.error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
