import { Badge } from "@/components/ui/badge";
import { Crown, Briefcase, BookOpen, FileText, MessageSquare, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCandidateSubscription } from "@/hooks/useCandidateSubscription";

interface Props {
  candidateId: string;
  jobTitle?: string;
}

/**
 * Subscription-driven application summary.
 * Replaces the old wallet/points cost breakdown — every value is now derived
 * from the candidate's active plan and monthly usage counters.
 */
export const JobApplicationCostBreakdown = ({ jobTitle }: Props) => {
  const sub = useCandidateSubscription();

  if (sub.loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading your plan…
      </div>
    );
  }

  const applyLimit = sub.limitFor("job_apply");
  const applyRemaining = sub.remainingFor("job_apply");
  const applyUnlimited = applyLimit === Infinity;
  const noQuota = !applyUnlimited && applyRemaining <= 0;

  const lines = [
    {
      icon: Briefcase,
      label: "Submit application",
      detail: applyUnlimited
        ? "Unlimited applications on your plan"
        : `${applyRemaining} of ${applyLimit} applications left this month`,
      included: true,
    },
    {
      icon: BookOpen,
      label: "AI Mock Interview rounds",
      detail: "Included for all candidates",
      included: true,
    },
    {
      icon: FileText,
      label: "Resume PDF exports",
      detail:
        sub.limitFor("resume_download") === Infinity
          ? "Unlimited downloads"
          : `${sub.remainingFor("resume_download")} of ${sub.limitFor("resume_download")} downloads left`,
      included: true,
    },
    {
      icon: MessageSquare,
      label: "Round-by-round feedback",
      detail: "Included after every interview",
      included: true,
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-primary/5 via-card to-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Included with your subscription
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
          {sub.planDef.name}
        </Badge>
      </div>

      {jobTitle && (
        <p className="text-[11px] text-muted-foreground truncate">For: {jobTitle}</p>
      )}

      <ul className="space-y-1.5">
        {lines.map((l) => {
          const Icon = l.icon;
          return (
            <li
              key={l.label}
              className="flex items-start gap-2 p-2 rounded-md bg-muted/40 border border-border/40"
            >
              <Icon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-foreground leading-tight">
                  {l.label}
                </p>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {l.detail}
                </p>
              </div>
              {l.included ? (
                <Badge
                  variant="secondary"
                  className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0 gap-0.5"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Included
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] shrink-0">
                  Upgrade
                </Badge>
              )}
            </li>
          );
        })}
      </ul>

      {noQuota && (
        <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-snug">
            You've used all your monthly applications.{" "}
            <Link to="/pricing" className="underline font-medium">
              Upgrade your plan
            </Link>{" "}
            to apply to more jobs.
          </p>
        </div>
      )}
    </div>
  );
};

export default JobApplicationCostBreakdown;
