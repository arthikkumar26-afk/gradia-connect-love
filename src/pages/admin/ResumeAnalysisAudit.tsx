import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Server,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuditLogRow {
  id: string;
  candidate_id: string | null;
  candidate_email: string | null;
  job_id: string | null;
  job_title: string | null;
  http_status: number | null;
  fallback_reason: string;
  used_fallback: boolean;
  application_state: string;
  overall_score: number | null;
  error_message: string | null;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  success: "Success",
  ai_credits: "AI credits exhausted (402)",
  ai_rate_limit: "Rate limited (429)",
  ai_server: "AI server error (5xx)",
  ai_other: "AI gateway error",
  ai_exception: "Network / exception",
  parse_failed: "AI response unparseable",
};

const STATE_LABELS: Record<string, string> = {
  ai_reviewed: "AI Reviewed",
  manual_review: "Manual Review",
  failed: "Failed",
};

const reasonIcon = (reason: string) => {
  switch (reason) {
    case "success":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "ai_credits":
      return <CreditCard className="h-3.5 w-3.5" />;
    case "ai_rate_limit":
      return <Clock className="h-3.5 w-3.5" />;
    case "ai_server":
      return <Server className="h-3.5 w-3.5" />;
    default:
      return <AlertTriangle className="h-3.5 w-3.5" />;
  }
};

const stateBadgeVariant = (state: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (state) {
    case "ai_reviewed":
      return "default";
    case "manual_review":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
};

const reasonBadgeVariant = (reason: string): "default" | "secondary" | "destructive" | "outline" => {
  if (reason === "success") return "default";
  if (reason === "ai_credits" || reason === "ai_rate_limit") return "secondary";
  return "destructive";
};

const ResumeAnalysisAudit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/admin/login");
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "owner"])
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You do not have admin privileges.",
          variant: "destructive",
        });
        navigate("/admin/login");
        return;
      }
      setIsAuthorized(true);
      setAuthChecking(false);
    };
    checkAuth();
  }, [navigate, toast]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("resume_analysis_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setRows((data as AuditLogRow[]) || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      toast({
        title: "Error",
        description: "Could not load resume analysis audit logs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchLogs();
  }, [isAuthorized]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (reasonFilter !== "all" && r.fallback_reason !== reasonFilter) return false;
      if (stateFilter !== "all" && r.application_state !== stateFilter) return false;
      if (!q) return true;
      return (
        r.candidate_email?.toLowerCase().includes(q) ||
        r.job_title?.toLowerCase().includes(q) ||
        r.error_message?.toLowerCase().includes(q) ||
        false
      );
    });
  }, [rows, search, reasonFilter, stateFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const aiReviewed = rows.filter((r) => r.application_state === "ai_reviewed").length;
    const manualReview = rows.filter((r) => r.application_state === "manual_review").length;
    const failed = rows.filter((r) => r.application_state === "failed").length;
    return { total, aiReviewed, manualReview, failed };
  }, [rows]);

  const handleExportCsv = () => {
    if (!filtered.length) {
      toast({ title: "Nothing to export", description: "Adjust filters and try again." });
      return;
    }
    const headers = [
      "created_at",
      "candidate_email",
      "job_title",
      "http_status",
      "fallback_reason",
      "used_fallback",
      "application_state",
      "overall_score",
      "error_message",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          r.created_at,
          r.candidate_email ?? "",
          r.job_title ?? "",
          r.http_status ?? "",
          r.fallback_reason,
          r.used_fallback ? "yes" : "no",
          r.application_state,
          r.overall_score ?? "",
          r.error_message ?? "",
        ]
          .map(escape)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-analysis-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume Analysis Audit
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total attempts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-primary">{stats.aiReviewed}</p>
              <p className="text-xs text-muted-foreground">AI reviewed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-amber-600">{stats.manualReview}</p>
              <p className="text-xs text-muted-foreground">Manual review (fallback)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent resume analysis attempts</CardTitle>
            <CardDescription>
              Showing the latest 500 attempts. Each row is one call to the AI resume-analysis pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, job title, or error message"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Fallback reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reasons</SelectItem>
                  {Object.entries(REASON_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Application state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {Object.entries(STATE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">Time</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead className="w-[90px]">HTTP</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="w-[80px] text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No audit log entries match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(r)}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.candidate_email || (
                            <span className="text-muted-foreground italic">unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.job_title || (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.http_status != null ? (
                            <span
                              className={`text-xs font-mono ${
                                r.http_status >= 500
                                  ? "text-destructive"
                                  : r.http_status === 402 || r.http_status === 429
                                  ? "text-amber-600"
                                  : r.http_status >= 200 && r.http_status < 300
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {r.http_status}
                            </span>
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={reasonBadgeVariant(r.fallback_reason)}
                            className="gap-1 font-normal"
                          >
                            {reasonIcon(r.fallback_reason)}
                            {REASON_LABELS[r.fallback_reason] ?? r.fallback_reason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={stateBadgeVariant(r.application_state)}
                            className="font-normal"
                          >
                            {STATE_LABELS[r.application_state] ?? r.application_state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {r.overall_score != null ? Number(r.overall_score).toFixed(0) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit log entry</DialogTitle>
            <DialogDescription>
              Recorded at {selected ? new Date(selected.created_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-muted-foreground">Candidate</div>
                <div className="col-span-2 break-all">{selected.candidate_email || "—"}</div>

                <div className="text-muted-foreground">Job</div>
                <div className="col-span-2">{selected.job_title || "—"}</div>

                <div className="text-muted-foreground">HTTP status</div>
                <div className="col-span-2 font-mono">{selected.http_status ?? "—"}</div>

                <div className="text-muted-foreground">Reason</div>
                <div className="col-span-2">
                  {REASON_LABELS[selected.fallback_reason] ?? selected.fallback_reason}
                </div>

                <div className="text-muted-foreground">Used fallback</div>
                <div className="col-span-2">{selected.used_fallback ? "Yes" : "No"}</div>

                <div className="text-muted-foreground">Application state</div>
                <div className="col-span-2">
                  {STATE_LABELS[selected.application_state] ?? selected.application_state}
                </div>

                <div className="text-muted-foreground">Overall score</div>
                <div className="col-span-2">
                  {selected.overall_score != null ? Number(selected.overall_score).toFixed(0) : "—"}
                </div>
              </div>

              {selected.error_message && (
                <div>
                  <div className="text-muted-foreground mb-1">Error message</div>
                  <pre className="bg-muted/50 rounded p-2 text-xs overflow-auto max-h-48 whitespace-pre-wrap break-all">
                    {selected.error_message}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResumeAnalysisAudit;
