import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Coins, Briefcase, BookOpen, FileText, MessageSquare,
  CheckCircle2, AlertTriangle, Loader2, Wallet,
} from "lucide-react";

// Tier definitions — must mirror POINT_PACKAGES in WalletTab/Signup
const TIERS = [
  { name: "Starter",  min: 400,   max: 999,  mockSessions: 0, exports: 1, feedback: "Basic" },
  { name: "Basic",    min: 1000,  max: 1999, mockSessions: 1, exports: 2, feedback: "Standard" },
  { name: "Pro",      min: 2000,  max: 4999, mockSessions: 3, exports: 5, feedback: "Detailed" },
  { name: "Premium",  min: 5000,  max: Infinity, mockSessions: 5, exports: 10, feedback: "Detailed + Coach" },
];

// Per-action costs (sync with PointsPricingPanel & WalletTab deductions)
const COSTS = {
  application: 0,
  mockInterview: 500,
  resumeExport: 150,
  feedbackReview: 0,
};

interface Props {
  candidateId: string;
  jobTitle?: string;
}

export const JobApplicationCostBreakdown = ({ candidateId, jobTitle }: Props) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateId) return;
    (async () => {
      const { data } = await supabase
        .from("wallets")
        .select("points_balance")
        .eq("user_id", candidateId)
        .maybeSingle();
      setBalance(data?.points_balance ?? 0);
      setLoading(false);
    })();
  }, [candidateId]);

  const tier = balance == null
    ? null
    : TIERS.find((t) => balance >= t.min && balance <= t.max) || TIERS[0];

  const lines = tier
    ? [
        {
          icon: Briefcase,
          label: "Submit application",
          detail: "Includes AI resume match score",
          cost: COSTS.application,
          included: true,
        },
        {
          icon: BookOpen,
          label: `AI Mock Interview rounds`,
          detail: tier.mockSessions
            ? `${tier.mockSessions}× included by your ${tier.name} tier`
            : `Top up to Basic+ to unlock`,
          cost: tier.mockSessions ? 0 : COSTS.mockInterview,
          included: tier.mockSessions > 0,
        },
        {
          icon: FileText,
          label: "Resume PDF exports",
          detail: `${tier.exports} export${tier.exports > 1 ? "s" : ""} bundled with this tier`,
          cost: 0,
          included: true,
        },
        {
          icon: MessageSquare,
          label: "Round-by-round feedback",
          detail: `${tier.feedback} feedback after each interview`,
          cost: 0,
          included: true,
        },
      ]
    : [];

  const totalSpend = lines.reduce((s, l) => s + (l.included ? 0 : l.cost), 0);
  const lowBalance = balance != null && balance < 400;

  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-primary/5 via-card to-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-yellow-600" />
          <p className="text-sm font-semibold text-foreground">
            Points breakdown for this application
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Wallet className="h-3 w-3" />
            {balance} pts
          </Badge>
        )}
      </div>

      {!loading && tier && (
        <>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Your tier:
            <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 text-[10px]">
              {tier.name}
            </Badge>
            {jobTitle && <span className="truncate">• {jobTitle}</span>}
          </div>

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
                      {l.cost === 0 ? "Free" : "Included"}
                    </Badge>
                  ) : (
                    <span className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 shrink-0">
                      {l.cost} pts
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between pt-2 border-t border-dashed">
            <p className="text-[11px] text-muted-foreground">
              Charged on <span className="font-semibold text-foreground">Apply</span>
            </p>
            <p className="text-sm font-bold text-foreground">
              {totalSpend === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">0 pts now</span>
              ) : (
                <span className="text-yellow-700 dark:text-yellow-400">{totalSpend} pts</span>
              )}
            </p>
          </div>

          {lowBalance && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-snug">
                Your balance is below the Starter tier. Top up your wallet to unlock mock
                interviews and feedback after applying.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JobApplicationCostBreakdown;
