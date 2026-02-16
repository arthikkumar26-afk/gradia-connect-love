import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Rocket,
  Upload,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Briefcase,
  MapPin,
  FileText,
  Crown,
  Lock,
  Star,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MatchedJob {
  id: string;
  job_title: string;
  location: string | null;
  department: string | null;
  salary_range: string | null;
  employer_id: string;
  matchScore: number;
  matchReasons: string[];
  applyStatus: "pending" | "applying" | "applied" | "already_applied" | "failed";
}

interface AIJobApplyTabProps {
  profile: any;
  resumeAnalysis: any;
  onNavigateToResume: () => void;
  onNavigateToUpgrade?: () => void;
}

export default function AIJobApplyTab({ profile, resumeAnalysis, onNavigateToResume, onNavigateToUpgrade }: AIJobApplyTabProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"check" | "scanning" | "results" | "applying">("check");
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [applyingIndex, setApplyingIndex] = useState(-1);
  const [appliedCount, setAppliedCount] = useState(0);
  const [totalToApply, setTotalToApply] = useState(0);
  const [existingApplicationJobIds, setExistingApplicationJobIds] = useState<Set<string>>(new Set());
  const [candidatePlan, setCandidatePlan] = useState<string>("basic");
  const [isPlanLoading, setIsPlanLoading] = useState(true);

  const hasResume = !!profile?.resume_url;
  const hasAnalysis = !!resumeAnalysis;
  const hasAccess = candidatePlan === "pro" || candidatePlan === "premium";

  // Fetch candidate subscription plan
  useEffect(() => {
    const fetchPlan = async () => {
      if (!profile?.id) { setIsPlanLoading(false); return; }
      setIsPlanLoading(true);
      try {
        const { data: sub } = await supabase
          .from("candidate_subscriptions")
          .select("plan, status, ends_at")
          .eq("candidate_id", profile.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sub && (!sub.ends_at || new Date(sub.ends_at) > new Date())) {
          setCandidatePlan(sub.plan);
        }
      } catch (err) {
        console.error("Error fetching plan:", err);
      } finally {
        setIsPlanLoading(false);
      }
    };
    fetchPlan();
  }, [profile?.id]);

  // Fetch existing applications to avoid duplicates
  useEffect(() => {
    const fetchExisting = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from("applications")
        .select("job_id")
        .eq("candidate_id", profile.id);
      if (data) {
        setExistingApplicationJobIds(new Set(data.map((a) => a.job_id)));
      }
    };
    fetchExisting();
  }, [profile?.id]);

  const scanAndMatchJobs = async () => {
    if (!profile?.id) return;
    setIsScanning(true);
    setStep("scanning");

    try {
      // Fetch active jobs
      const { data: allJobs, error } = await supabase
        .from("jobs")
        .select("id, job_title, location, department, salary_range, employer_id, description, experience_required, skills, segment, designation, subjects, program, classes, board")
        .eq("status", "active")
        .neq("employer_id", profile.id);

      if (error) throw error;
      if (!allJobs || allJobs.length === 0) {
        setMatchedJobs([]);
        setStep("results");
        setIsScanning(false);
        return;
      }

      // Score jobs using existing matching algorithm
      const scored: MatchedJob[] = allJobs.map((job) => {
        let score = 0;
        const matchReasons: string[] = [];

        // Preferred role match
        if (profile.preferred_role && job.job_title) {
          const pr = profile.preferred_role.toLowerCase();
          const jt = job.job_title.toLowerCase();
          const desc = job.description?.toLowerCase() || "";
          if (jt.includes(pr) || pr.includes(jt)) {
            score += 30;
            matchReasons.push("Matches your preferred role");
          } else if (desc.includes(pr)) {
            score += 15;
            matchReasons.push("Related to your preferred role");
          }
        }

        // Location match
        if (job.location) {
          const loc = job.location.toLowerCase();
          if (profile.preferred_district && loc.includes(profile.preferred_district.toLowerCase())) {
            score += 20;
            matchReasons.push("Preferred location match");
          } else if (profile.preferred_state && loc.includes(profile.preferred_state.toLowerCase())) {
            score += 15;
            matchReasons.push("Same state");
          }
        }

        // Primary subject match
        if (profile.primary_subject && job.job_title) {
          const subj = profile.primary_subject.toLowerCase();
          const jt = job.job_title.toLowerCase();
          const desc = job.description?.toLowerCase() || "";
          if (jt.includes(subj) || desc.includes(subj)) {
            score += 25;
            matchReasons.push("Subject expertise match");
          }
        }

        // Experience level match
        if (profile.experience_level && job.experience_required) {
          const exp = profile.experience_level.toLowerCase();
          const jexp = job.experience_required.toLowerCase();
          if (
            (exp.includes("fresher") && (jexp.includes("fresher") || jexp.includes("0-1") || jexp.includes("entry"))) ||
            (exp.includes("1-3") && jexp.includes("1-3")) ||
            (exp.includes("3-5") && (jexp.includes("3-5") || jexp.includes("2-5"))) ||
            (exp.includes("5+") && (jexp.includes("5+") || jexp.includes("5-")))
          ) {
            score += 20;
            matchReasons.push("Experience level match");
          }
        }

        // Skills match from resume analysis
        const jobSkills = job.skills as string[] | null;
        if (jobSkills && jobSkills.length > 0 && resumeAnalysis?.skill_highlights) {
          const candidateSkills = resumeAnalysis.skill_highlights.map((s: string) => s.toLowerCase());
          const matched = jobSkills.filter((skill: string) =>
            candidateSkills.some((cs: string) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))
          );
          if (matched.length > 0) {
            score += Math.min(25, matched.length * 8);
            matchReasons.push(`${matched.length} skill${matched.length > 1 ? "s" : ""} matched`);
          }
        }

        const alreadyApplied = existingApplicationJobIds.has(job.id);

        return {
          id: job.id,
          job_title: job.job_title,
          location: job.location,
          department: job.department,
          salary_range: job.salary_range,
          employer_id: job.employer_id,
          matchScore: score,
          matchReasons,
          applyStatus: alreadyApplied ? "already_applied" as const : "pending" as const,
        };
      });

      // Filter and sort - only jobs with score > 20
      const filtered = scored
        .filter((j) => j.matchScore > 20)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 20);

      setMatchedJobs(filtered);
      setStep("results");
    } catch (err) {
      console.error("Scan error:", err);
      toast({ title: "Error", description: "Failed to scan jobs. Please try again.", variant: "destructive" });
      setStep("check");
    } finally {
      setIsScanning(false);
    }
  };

  const autoApplyAll = async () => {
    const jobsToApply = matchedJobs.filter((j) => j.applyStatus === "pending");
    if (jobsToApply.length === 0) return;

    setStep("applying");
    setTotalToApply(jobsToApply.length);
    setAppliedCount(0);

    for (let i = 0; i < matchedJobs.length; i++) {
      const job = matchedJobs[i];
      if (job.applyStatus !== "pending") continue;

      setApplyingIndex(i);
      setMatchedJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, applyStatus: "applying" } : j)));

      // Small delay for UX
      await new Promise((r) => setTimeout(r, 800));

      try {
        const { error } = await supabase.from("applications").insert({
          candidate_id: profile.id,
          job_id: job.id,
          cover_letter: `AI Auto-Applied - Match Score: ${Math.min(95, 50 + Math.round(job.matchScore * 0.5))}%. Reasons: ${job.matchReasons.join(", ")}`,
          status: "pending",
        });

        if (error && !error.message.includes("duplicate")) {
          throw error;
        }

        setMatchedJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, applyStatus: "applied" } : j)));
        setAppliedCount((c) => c + 1);
        setExistingApplicationJobIds((prev) => new Set([...prev, job.id]));
      } catch (err) {
        console.error("Apply error for job", job.id, err);
        setMatchedJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, applyStatus: "failed" } : j)));
      }
    }

    setApplyingIndex(-1);
    toast({
      title: "Auto-Apply Complete",
      description: `Successfully applied to ${appliedCount + 1} jobs!`,
    });
  };

  const getMatchPercent = (score: number) => Math.min(95, 50 + Math.round(score * 0.5));

  // Step 0: Check subscription access
  if (isPlanLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI Job Apply</h2>
          <p className="text-sm text-muted-foreground">Let AI automatically apply to jobs that match your profile</p>
        </div>
        <Card className="p-8 text-center border-dashed border-2 border-primary/30">
          <Lock className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Premium Feature</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            AI Job Apply is available on <strong>Pro</strong> and <strong>Premium</strong> plans. Upgrade to unlock automated job applications powered by AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Card className="p-4 border-primary/20 bg-primary/5 text-left max-w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Pro Plan</span>
              </div>
              <p className="text-lg font-bold text-foreground">₹499<span className="text-xs text-muted-foreground font-normal">/month</span></p>
              <p className="text-xs text-muted-foreground mt-1">10 auto-applies/month</p>
            </Card>
            <Card className="p-4 border-primary/20 bg-primary/5 text-left max-w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Premium Plan</span>
              </div>
              <p className="text-lg font-bold text-foreground">₹999<span className="text-xs text-muted-foreground font-normal">/month</span></p>
              <p className="text-xs text-muted-foreground mt-1">Unlimited auto-applies</p>
            </Card>
          </div>
          <Button onClick={onNavigateToUpgrade} className="gap-2">
            <Crown className="h-4 w-4" />
            Upgrade Now
          </Button>
        </Card>
      </div>
    );
  }

  // Step 1: Check resume
  if (!hasResume || !hasAnalysis) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI Job Apply</h2>
          <p className="text-sm text-muted-foreground">Let AI automatically apply to jobs that match your profile</p>
        </div>
        <Card className="p-8 text-center border-dashed border-2">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Resume Required</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Please upload your resume first. Our AI will scan it, analyze your skills and experience, then find and apply to matching jobs automatically.
          </p>
          <Button onClick={onNavigateToResume} className="gap-2">
            <Upload className="h-4 w-4" />
            Go to Resume Builder
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI Job Apply</h2>
          <p className="text-sm text-muted-foreground">AI scans your resume and auto-applies to matching jobs</p>
        </div>
        {step === "results" && (
          <Button variant="outline" size="sm" onClick={scanAndMatchJobs}>
            <Search className="h-4 w-4 mr-2" />
            Rescan
          </Button>
        )}
      </div>

      {/* Resume Status */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Resume Uploaded & Analyzed</p>
            <p className="text-sm text-muted-foreground">
              {resumeAnalysis?.skill_highlights?.length || 0} skills detected • {resumeAnalysis?.career_level || "N/A"} level
            </p>
          </div>
          {step === "check" && (
            <Button onClick={scanAndMatchJobs} className="gap-2">
              <Search className="h-4 w-4" />
              Scan & Match Jobs
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Scanning */}
      {step === "scanning" && (
        <Card className="p-8 text-center">
          <Loader2 className="h-10 w-10 mx-auto mb-4 text-primary animate-spin" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Scanning Jobs...</h3>
          <p className="text-muted-foreground">Matching your profile against available positions</p>
        </Card>
      )}

      {/* Results */}
      {(step === "results" || step === "applying") && (
        <>
          {matchedJobs.length === 0 ? (
            <Card className="p-8 text-center">
              <Briefcase className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Matching Jobs Found</h3>
              <p className="text-muted-foreground">Complete your profile with more details for better matches.</p>
            </Card>
          ) : (
            <>
              {/* Summary & Apply All */}
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {matchedJobs.filter((j) => j.applyStatus === "pending").length} new matching jobs found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {matchedJobs.filter((j) => j.applyStatus === "already_applied").length} already applied
                    </p>
                  </div>
                  <Button
                    onClick={autoApplyAll}
                    disabled={step === "applying" || matchedJobs.filter((j) => j.applyStatus === "pending").length === 0}
                    className="gap-2"
                  >
                    {step === "applying" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying... ({appliedCount}/{totalToApply})
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        Auto Apply All
                      </>
                    )}
                  </Button>
                </CardContent>
                {step === "applying" && totalToApply > 0 && (
                  <div className="px-4 pb-4">
                    <Progress value={(appliedCount / totalToApply) * 100} className="h-2" />
                  </div>
                )}
              </Card>

              {/* Job List */}
              <div className="space-y-3">
                {matchedJobs.map((job, idx) => (
                  <Card
                    key={job.id}
                    className={`transition-all ${applyingIndex === idx ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate">{job.job_title}</h4>
                          <Badge variant="secondary" className="shrink-0">
                            {getMatchPercent(job.matchScore)}% Match
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {job.department && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {job.department}
                            </span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          )}
                          {job.salary_range && <span>{job.salary_range}</span>}
                        </div>
                        {job.matchReasons.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {job.matchReasons.join(" • ")}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {job.applyStatus === "applied" && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                            <CheckCircle className="h-3 w-3" /> Applied
                          </Badge>
                        )}
                        {job.applyStatus === "already_applied" && (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <FileText className="h-3 w-3" /> Already Applied
                          </Badge>
                        )}
                        {job.applyStatus === "applying" && (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Applying...
                          </Badge>
                        )}
                        {job.applyStatus === "failed" && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Failed
                          </Badge>
                        )}
                        {job.applyStatus === "pending" && (
                          <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
