import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Brain,
  Database,
  ShieldCheck,
  FileText,
  Inbox,
} from "lucide-react";

interface AuditRow {
  id: string;
  created_at: string;
  http_status: number | null;
  fallback_reason: string | null;
  used_fallback: boolean | null;
  application_state: string | null;
  overall_score: number | string | null;
  error_message: string | null;
  job_id: string | null;
}

interface ApplicationTimelineProps {
  candidateId: string;
  applicationId: string;
  jobId: string;
  appliedAt: string;
  applicationStatus: string;
  hasInterviewCandidate: boolean;
  aiScore: number | null;
}

type StepStatus = "success" | "warning" | "error" | "info" | "pending";

interface TimelineStep {
  key: string;
  title: string;
  description: string;
  status: StepStatus;
  timestamp?: string | null;
  details?: string;
  icon: React.ReactNode;
}

const REASON_COPY: Record<string, string> = {
  ai_credits: "AI service ran out of credits. Saved a manual-review fallback so your application still went through.",
  ai_rate_limit: "AI service was rate-limited. Saved a manual-review fallback so your application still went through.",
  ai_server: "AI service had a temporary server error. Saved a manual-review fallback so your application still went through.",
  ai_invalid_response: "AI returned an unreadable response. Saved a default analysis so your application still went through.",
  parse_failed: "We could not fully read your resume — used your saved profile data instead.",
  validation_error: "Some required information was missing in the request.",
  unknown: "An unexpected error occurred.",
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatusDot = ({ status }: { status: StepStatus }) => {
  const map: Record<StepStatus, string> = {
    success: "bg-success border-success/40",
    warning: "bg-warning border-warning/40",
    error: "bg-destructive border-destructive/40",
    info: "bg-primary border-primary/40",
    pending: "bg-muted-foreground/40 border-muted-foreground/30",
  };
  return (
    <div
      className={`h-3 w-3 rounded-full border-2 ring-4 ring-background ${map[status]}`}
      aria-hidden="true"
    />
  );
};

const StatusBadge = ({ status, label }: { status: StepStatus; label: string }) => {
  const variants: Record<StepStatus, string> = {
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    error: "bg-destructive/10 text-destructive border-destructive/30",
    info: "bg-primary/10 text-primary border-primary/30",
    pending: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${variants[status]}`}>
      {label}
    </Badge>
  );
};

export const ApplicationTimeline = ({
  candidateId,
  jobId,
  appliedAt,
  applicationStatus,
  hasInterviewCandidate,
  aiScore,
}: ApplicationTimelineProps) => {
  const [audit, setAudit] = useState<AuditRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        // Get the most recent audit row for this candidate + job (if any).
        const { data, error } = await supabase
          .from("resume_analysis_audit_logs")
          .select(
            "id, created_at, http_status, fallback_reason, used_fallback, application_state, overall_score, error_message, job_id",
          )
          .eq("candidate_id", candidateId)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data) setAudit(data as AuditRow);
        else setAudit(null);
      } catch {
        if (!cancelled) setAudit(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [candidateId, jobId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---- Build steps ----
  const steps: TimelineStep[] = [];

  // 1. Application submitted (always)
  steps.push({
    key: "submitted",
    title: "Application submitted",
    description: "Your application was received by our system.",
    status: "success",
    timestamp: appliedAt,
    icon: <Inbox className="h-4 w-4" />,
  });

  // 2. Identity / session check (always success — user is logged in & viewing this)
  steps.push({
    key: "auth",
    title: "Identity verified",
    description: "Your login session was validated before submission.",
    status: "success",
    icon: <ShieldCheck className="h-4 w-4" />,
  });

  // 3. Resume parsing & analysis — driven by the audit row
  if (audit) {
    const httpStatus = audit.http_status;
    const reason = audit.fallback_reason || "";
    const usedFallback = !!audit.used_fallback;
    const score = audit.overall_score != null ? Number(audit.overall_score) : null;
    const reasonCopy = REASON_COPY[reason] || (reason ? reason : "");

    if (httpStatus === 200 && !usedFallback) {
      steps.push({
        key: "ai",
        title: "Resume analyzed by AI",
        description: `AI scored your resume${score != null ? ` (${score}%)` : ""} and matched it against the role.`,
        status: "success",
        timestamp: audit.created_at,
        details: "HTTP 200 · AI analysis succeeded",
        icon: <Brain className="h-4 w-4" />,
      });
    } else if (usedFallback) {
      steps.push({
        key: "ai",
        title: "AI analysis used a safe fallback",
        description:
          reasonCopy ||
          "AI service was unavailable. Saved a default analysis so your application still went through.",
        status: "warning",
        timestamp: audit.created_at,
        details: `${httpStatus ? `HTTP ${httpStatus}` : "Fallback"}${
          reason ? ` · ${reason}` : ""
        }${score != null ? ` · score ${score}%` : ""}`,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    } else if (httpStatus && httpStatus >= 400) {
      steps.push({
        key: "ai",
        title: "Resume analysis failed",
        description:
          audit.error_message ||
          reasonCopy ||
          "We could not analyze your resume this time.",
        status: "error",
        timestamp: audit.created_at,
        details: `HTTP ${httpStatus}${reason ? ` · ${reason}` : ""}`,
        icon: <XCircle className="h-4 w-4" />,
      });
    } else {
      steps.push({
        key: "ai",
        title: "Resume analysis completed",
        description: "Resume processed successfully.",
        status: "info",
        timestamp: audit.created_at,
        icon: <Brain className="h-4 w-4" />,
      });
    }
  } else {
    // No audit row — older application or analysis not run.
    steps.push({
      key: "ai",
      title: "Resume analysis",
      description:
        aiScore != null
          ? `Completed earlier — AI score ${aiScore}%.`
          : "No analysis log available for this application.",
      status: aiScore != null ? "success" : "info",
      icon: <Brain className="h-4 w-4" />,
    });
  }

  // 4. Database insert — derived from audit.application_state and the fact that this row exists
  const dbState = audit?.application_state || "";
  if (dbState === "created" || dbState === "updated") {
    steps.push({
      key: "db",
      title: dbState === "created" ? "Application saved to database" : "Application updated in database",
      description:
        "Your application row was written successfully and now appears in your My Applications list.",
      status: "success",
      timestamp: audit?.created_at,
      details: dbState === "created" ? "INSERT ok" : "UPDATE ok",
      icon: <Database className="h-4 w-4" />,
    });
  } else if (dbState === "failed") {
    steps.push({
      key: "db",
      title: "Database insert failed",
      description:
        audit?.error_message ||
        "Saving your application to the database failed. Please try again.",
      status: "error",
      timestamp: audit?.created_at,
      details: "Insert/update returned an error",
      icon: <XCircle className="h-4 w-4" />,
    });
  } else {
    // Fallback: we know the row exists in `applications` (we wouldn't be on this card otherwise)
    steps.push({
      key: "db",
      title: "Application saved to database",
      description: "Your application is recorded and visible in My Applications.",
      status: "success",
      timestamp: appliedAt,
      icon: <Database className="h-4 w-4" />,
    });
  }

  // 5. Pipeline / interview record
  if (hasInterviewCandidate) {
    steps.push({
      key: "pipeline",
      title: "Interview pipeline created",
      description: "You have been added to the hiring pipeline for this role.",
      status: "success",
      icon: <FileText className="h-4 w-4" />,
    });
  } else {
    steps.push({
      key: "pipeline",
      title: "Interview pipeline pending",
      description: "Awaiting employer review before the next stage opens.",
      status: "pending",
      icon: <Clock className="h-4 w-4" />,
    });
  }

  // 6. Current overall status
  const statusMap: Record<string, { label: string; status: StepStatus; description: string }> = {
    pending: { label: "Pending", status: "pending", description: "Awaiting employer review." },
    in_review: { label: "In Review", status: "info", description: "The employer is reviewing your application." },
    reviewed: { label: "Reviewed", status: "info", description: "The employer has reviewed your application." },
    shortlisted: { label: "Shortlisted", status: "success", description: "You have been shortlisted." },
    interview: { label: "Interview", status: "info", description: "Interview stage in progress." },
    offered: { label: "Offered", status: "success", description: "An offer has been extended." },
    accepted: { label: "Accepted", status: "success", description: "Offer accepted." },
    rejected: { label: "Not Selected", status: "error", description: "The employer did not move forward this time." },
  };
  const cur = statusMap[applicationStatus] || {
    label: applicationStatus,
    status: "info" as StepStatus,
    description: "",
  };
  steps.push({
    key: "status",
    title: `Current status: ${cur.label}`,
    description: cur.description,
    status: cur.status,
    icon: <CheckCircle2 className="h-4 w-4" />,
  });

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground text-sm">Processing Timeline</h4>
        <span className="text-xs text-muted-foreground">
          What happened behind the scenes
        </span>
      </div>

      <ol className="relative border-l-2 border-border ml-1.5 space-y-4 pb-1">
        {steps.map((step) => (
          <li key={step.key} className="ml-4 pl-2">
            <div className="absolute -left-[7px]">
              <StatusDot status={step.status} />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{step.icon}</span>
                <span className="text-sm font-medium text-foreground">{step.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {step.timestamp && (
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateTime(step.timestamp)}
                  </span>
                )}
                <StatusBadge
                  status={step.status}
                  label={
                    step.status === "success"
                      ? "OK"
                      : step.status === "warning"
                        ? "Fallback"
                        : step.status === "error"
                          ? "Error"
                          : step.status === "pending"
                            ? "Pending"
                            : "Info"
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {step.description}
            </p>
            {step.details && (
              <p className="text-[11px] font-mono text-muted-foreground/80 mt-1 bg-muted/40 rounded px-2 py-1 inline-block">
                {step.details}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};
