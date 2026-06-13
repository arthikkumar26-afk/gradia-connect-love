import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Coins, BookOpen, FileText, Sparkles, UserCheck, Briefcase,
  Workflow, ChevronRight, Info, Layers,
} from "lucide-react";
import { interviewPipelineConfig, PipelineStage } from "@/data/interviewPipelineConfig";

// Per-feature point costs (must match the values used across the codebase).
// Mock interviews are free and are intentionally not listed as wallet deductions.
const FEATURE_COSTS: Array<{
  key: string;
  label: string;
  cost: number;
  unit: string;
  description: string;
  icon: any;
  color: string;
}> = [
  {
    key: "resume_export",
    label: "Resume PDF Export",
    cost: 150,
    unit: "per download",
    description: "Generate & download an ATS-ready resume PDF.",
    icon: FileText,
    color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  {
    key: "ai_resume_score",
    label: "AI Resume Score & ATS Report",
    cost: 100,
    unit: "per report",
    description: "AI-powered ATS scoring with detailed improvement insights.",
    icon: Sparkles,
    color: "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    key: "job_applications",
    label: "Job Application",
    cost: 50,
    unit: "per apply",
    description: "Points are deducted from your wallet for each job application.",
    icon: Briefcase,
    color: "text-blue-700 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    key: "featured_profile",
    label: "Featured Profile Badge",
    cost: 1000,
    unit: "per month",
    description: "Boost your profile visibility to top employers for 30 days.",
    icon: UserCheck,
    color: "text-purple-700 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300",
  },
];

interface CandidateProfile {
  preferred_role?: string | null;
  category?: string | null;
  segment?: string | null;
}

// Map a candidate's department/role to one of the pipeline configs.
const resolvePipeline = (profile: CandidateProfile | null) => {
  const role = (profile?.preferred_role || "").toLowerCase();
  const cat = (profile?.category || "").toLowerCase();
  const seg = (profile?.segment || "").toLowerCase();
  const all = `${role} ${cat} ${seg}`;

  // 1. Education roles
  if (all.match(/teacher|principal|sme|subject matter|tutor|professor|lecturer|education/)) {
    const edu = interviewPipelineConfig.find((c) => c.value === "education");
    if (edu) {
      const match =
        edu.pipelineTypes.find((p) => all.includes(p.value.toLowerCase())) ||
        edu.pipelineTypes[0];
      return { interviewType: edu.label, pipelineType: match };
    }
  }

  // 2. IT / Software
  if (all.match(/software|developer|engineer|frontend|backend|full[\s-]?stack|devops|cyber|data|cloud|qa|tester|ui|ux/)) {
    const it = interviewPipelineConfig.find((c) => c.value === "it_corporate" || c.value === "itcorporate" || c.label.toLowerCase().includes("it"));
    if (it) {
      const match =
        it.pipelineTypes.find((p) => all.includes(p.value.toLowerCase())) ||
        it.pipelineTypes[0];
      return { interviewType: it.label, pipelineType: match };
    }
  }

  // 3. Civil
  if (all.match(/civil|construction|site engineer|structural/)) {
    const civil = interviewPipelineConfig.find((c) => c.value.includes("civil"));
    if (civil) return { interviewType: civil.label, pipelineType: civil.pipelineTypes[0] };
  }

  // 4. Film / Media
  if (all.match(/film|media|actor|audition|production|director/)) {
    const fm = interviewPipelineConfig.find((c) => c.value.includes("film") || c.value.includes("media"));
    if (fm) return { interviewType: fm.label, pipelineType: fm.pipelineTypes[0] };
  }

  // 5. Banking & Finance
  if (all.match(/bank|finance|account|audit|loan/)) {
    const bk = interviewPipelineConfig.find((c) => c.value.includes("bank") || c.value.includes("finance"));
    if (bk) return { interviewType: bk.label, pipelineType: bk.pipelineTypes[0] };
  }

  // Fallback to first available config
  const first = interviewPipelineConfig[0];
  return { interviewType: first.label, pipelineType: first.pipelineTypes[0] };
};

export default function PointsPricingPanel({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("preferred_role, category, segment")
        .eq("id", userId)
        .maybeSingle();
      setProfile(data as CandidateProfile);
      setLoading(false);
    })();
  }, [userId]);

  const { interviewType, pipelineType } = useMemo(() => resolvePipeline(profile), [profile]);

  const stages: PipelineStage[] = pipelineType?.stages || [];
  const totalCost = 0;

  return (
    <div className="space-y-4">
      {/* Per-feature cost grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            Points Deduction Guide
          </CardTitle>
          <CardDescription>
            Exactly what gets deducted from your wallet per action — no hidden charges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURE_COSTS.map((f) => {
              const Icon = f.icon;
              const free = f.cost === 0;
              return (
                <div
                  key={f.key}
                  className="border border-border rounded-lg p-3 bg-card hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${f.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground">{f.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-[11px] text-muted-foreground leading-snug pr-2">{f.description}</p>
                    {free ? (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                        FREE
                      </Badge>
                    ) : (
                      <span className="text-base font-bold text-yellow-600 dark:text-yellow-400 shrink-0">
                        {f.cost} pts
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-dashed">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Points are deducted only when you confirm the action (e.g. "Pay 500 pts to Unlock"). Unused points never expire.
              Refunds are issued automatically if a session fails before it starts.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline breakdown (department-specific) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Your AI Mock Interview Pipeline
          </CardTitle>
          <CardDescription>
            Based on your selected department, this pipeline is available without wallet deduction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading pipeline…</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b">
                <Badge variant="outline" className="gap-1">
                  <Layers className="h-3 w-3" />
                  {interviewType}
                </Badge>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/15">
                  {pipelineType?.label || "Default"}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {stages.length} rounds
                </span>
              </div>

              <ol className="space-y-2">
                {stages.map((stage, idx) => (
                  <li
                    key={`${stage.order}-${stage.name}`}
                    className="flex gap-3 p-2.5 rounded-md border border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      {idx < stages.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-semibold text-foreground">{stage.name}</p>
                        {stage.isAutomated && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">AI</Badge>
                        )}
                        {stage.isOptional && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Optional</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {stage.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <Separator className="my-4" />

              <div className="flex items-center justify-between p-3 rounded-md bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border border-yellow-200 dark:border-yellow-900/40">
                <div>
                  <p className="text-xs font-medium text-foreground">Total pipeline cost</p>
                  <p className="text-[10px] text-muted-foreground">
                    Covers all {stages.length} rounds end-to-end
                  </p>
                </div>
                <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  Free
                </span>
              </div>

              {!profile?.preferred_role && (
                <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Set your preferred role in Settings to see the exact pipeline tailored to your department.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
