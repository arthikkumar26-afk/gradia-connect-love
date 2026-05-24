import { useState, useEffect, useRef } from "react";
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
  FileUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCandidateSubscription } from "@/hooks/useCandidateSubscription";

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
  onResumeUploaded?: (analysis: any, resumeUrl: string) => void;
}

export default function AIJobApplyTab({ profile, resumeAnalysis, onNavigateToResume, onNavigateToUpgrade, onResumeUploaded }: AIJobApplyTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"check" | "scanning" | "results" | "applying">("check");
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [applyingIndex, setApplyingIndex] = useState(-1);
  const [appliedCount, setAppliedCount] = useState(0);
  const [totalToApply, setTotalToApply] = useState(0);
  const [existingApplicationJobIds, setExistingApplicationJobIds] = useState<Set<string>>(new Set());
  const [candidatePlan, setCandidatePlan] = useState<string>("free");
  const [isPlanLoading, setIsPlanLoading] = useState(true);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [localResumeAnalysis, setLocalResumeAnalysis] = useState<any>(resumeAnalysis);
  const [localProfile, setLocalProfile] = useState<any>(profile);

  const hasResume = !!(localProfile?.resume_url || profile?.resume_url);
  const hasAnalysis = !!(localResumeAnalysis || resumeAnalysis);
  const effectiveAnalysis = localResumeAnalysis || resumeAnalysis;
  const effectiveProfile = localProfile || profile;
  const [dayPassExpiresAt, setDayPassExpiresAt] = useState<number | null>(null);
  const [isPurchasingDayPass, setIsPurchasingDayPass] = useState(false);
  const DAY_PASS_POINTS = 400;

  // Subscription-driven quota for AI Job Apply (basic=0, pro=5/mo, premium=∞)
  const sub = useCandidateSubscription();
  const aiApplyLimit = sub.limitFor("ai_job_apply");
  const aiApplyUsed = sub.usedFor("ai_job_apply");
  const aiApplyRemaining = sub.remainingFor("ai_job_apply");

  // Day-pass is only honoured for paid plans — basic users can never bypass the gate.
  const isPaidPlan = candidatePlan === "pro_accelerator" || candidatePlan === "elite" || candidatePlan === "advance";
  const hasActiveDayPass = isPaidPlan && !!dayPassExpiresAt && dayPassExpiresAt > Date.now();
  const hasAccess = isPaidPlan || hasActiveDayPass;

  // Sync external props into local state when they update
  useEffect(() => { if (resumeAnalysis) setLocalResumeAnalysis(resumeAnalysis); }, [resumeAnalysis]);
  useEffect(() => { if (profile) setLocalProfile(profile); }, [profile]);

  // Also check candidate_resumes (Resume Builder saved data) — treat it as resume + analysis
  useEffect(() => {
    const fetchBuilderResume = async () => {
      if (!profile?.id || resumeAnalysis) return;
      try {
        const { data: savedResume } = await supabase
          .from("candidate_resumes")
          .select("skills, full_name, summary")
          .eq("user_id", profile.id)
          .maybeSingle();

        if (savedResume && (savedResume.skills?.length || savedResume.full_name)) {
          // Build analysis-compatible object from builder skills
          setLocalResumeAnalysis({
            skill_highlights: savedResume.skills || [],
            overall_score: 60,
            strengths: savedResume.skills?.slice(0, 3) || [],
            areas_for_improvement: [],
            career_level: "",
          });
          // Mark as having a resume so the upload screen is skipped
          setLocalProfile((prev: any) => ({
            ...prev,
            resume_url: prev?.resume_url || "builder_resume",
          }));
        }
      } catch (err) {
        console.error("Error fetching builder resume for AI Job Apply:", err);
      }
    };
    fetchBuilderResume();
  }, [profile?.id, resumeAnalysis]);

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
          .in("status", ["active", "trial"])
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

  // Load existing day pass from localStorage (per user)
  useEffect(() => {
    if (!profile?.id) return;
    const key = `ai_job_apply_day_pass_${profile.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const expires = parseInt(stored, 10);
      if (!Number.isNaN(expires) && expires > Date.now()) {
        setDayPassExpiresAt(expires);
      } else {
        localStorage.removeItem(key);
      }
    }
  }, [profile?.id]);

  const handlePurchaseDayPass = async () => {
    if (!profile?.id) return;
    setIsPurchasingDayPass(true);
    try {
      // AI Job Apply is now subscription-gated (see useCandidateSubscription)
      const { data: sub } = await supabase
        .from("candidate_subscriptions")
        .select("plan, status, ends_at")
        .eq("candidate_id", profile.id)
        .eq("status", "active")
        .maybeSingle();

      const active = sub && (sub.ends_at == null || new Date(sub.ends_at) > new Date());
      const plan = active ? (sub!.plan as string) : "free";

      if (plan === "free") {
        toast({
          title: "Upgrade required",
          description: "AI Job Apply is available on the Pro and Premium plans.",
          variant: "destructive",
        });
        return;
      }

      // Pro / Premium: grant a 24h access window for AI Job Apply.
      // Per-application quota is enforced inside the apply flow via consume("ai_job_apply").
      const expires = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(`ai_job_apply_day_pass_${profile.id}`, String(expires));
      setDayPassExpiresAt(expires);
      toast({ title: "Access unlocked", description: "AI Job Apply is unlocked for 24 hours under your plan." });
    } catch (e) {
      console.error("Day pass unlock failed:", e);
      toast({ title: "Error", description: "Could not unlock access. Please try again.", variant: "destructive" });
    } finally {
      setIsPurchasingDayPass(false);
    }
  };

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

  // Inline resume upload + AI parse
  const handleInlineResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a PDF, Word document, or image.", variant: "destructive" });
      return;
    }

    setIsUploadingResume(true);
    toast({ title: "Analyzing resume...", description: "AI is reading your resume to find matching jobs." });

    try {
      // 1. Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/resume.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(filePath);

      // 2. Parse resume with AI
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);
      const parseRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
        { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` }, body: formData }
      );
      const parsed = parseRes.ok ? await parseRes.json() : null;

      // 3. Analyze resume
      let analysisData = null;
      if (parsed) {
        const analyzeRes = await supabase.functions.invoke("analyze-resume", {
          body: { resumeData: parsed, candidateId: profile.id },
        });
        analysisData = analyzeRes.data;
      }

      // 4. Update profile resume_url
      await supabase.from("profiles").update({ resume_url: publicUrl }).eq("id", profile.id);

      // 5. Update local state so jobs scan immediately
      const newAnalysis = analysisData || { skill_highlights: parsed?.skill_highlights || [], overall_score: 0 };
      setLocalResumeAnalysis(newAnalysis);
      setLocalProfile((prev: any) => ({ ...prev, resume_url: publicUrl }));
      if (onResumeUploaded) onResumeUploaded(newAnalysis, publicUrl);

      toast({ title: "Resume uploaded!", description: "Now scanning for matching jobs..." });

      // 6. Auto-trigger scan
      setTimeout(() => scanAndMatchJobs(), 300);
    } catch (err: any) {
      console.error("Resume upload error:", err);
      toast({ title: "Upload failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const scanAndMatchJobs = async () => {
    const activeProfile = localProfile || profile;
    const activeAnalysis = localResumeAnalysis || resumeAnalysis;
    if (!activeProfile?.id) return;
    setIsScanning(true);
    setStep("scanning");

    try {
      // Fetch active jobs
      const { data: allJobs, error } = await supabase
        .from("jobs")
        .select("id, job_title, location, department, salary_range, employer_id, description, experience_required, skills, segment, category, designation, subjects, program, classes, board, interview_type")
        .eq("status", "active")
        .neq("employer_id", activeProfile.id);

      if (error) throw error;
      if (!allJobs || allJobs.length === 0) {
        setMatchedJobs([]);
        setStep("results");
        setIsScanning(false);
        return;
      }

      // Determine candidate's industry category from segment/category/preferred_role
      const candidateSegment = (activeProfile.segment || "").toLowerCase();
      const candidateCategory = (activeProfile.category || "").toLowerCase();
      const candidatePreferredRole = (activeProfile.preferred_role || "").toLowerCase();

      // Map segment values to industry type buckets
      const isEducationSegment = (seg: string) =>
        ["education", "school", "college", "university", "teaching", "teacher"].some((k) => seg.includes(k));
      const isITSegment = (seg: string) =>
        ["it_corporate", "it corporate", "software", "tech", "cyber", "data", "cloud", "dev", "engineer"].some((k) => seg.includes(k));
      const isNonITSegment = (seg: string) =>
        ["non_it", "non-it", "hr", "marketing", "sales", "finance", "legal", "operations", "management"].some((k) => seg.includes(k));

      // IT detection also uses preferred_role since category/segment are often null
      const itRoleKeywords = ["developer", "engineer", "programmer", "devops", "frontend", "backend",
        "full stack", "data scientist", "data analyst", "cloud", "cybersecurity", "software",
        "react", "python", "java", "node", "angular", "mobile", "android", "ios", "machine learning", "ai engineer"];
      const educationRoleKeywords = ["teacher", "lecturer", "professor", "principal", "tutor",
        "educator", "faculty", "instructor", "headmaster", "headmistress"];

      const roleIsIT = itRoleKeywords.some((k) => candidatePreferredRole.includes(k));
      const roleIsEducation = educationRoleKeywords.some((k) => candidatePreferredRole.includes(k));

      const candidateIsEducation = isEducationSegment(candidateSegment) || isEducationSegment(candidateCategory) || roleIsEducation;
      const candidateIsIT = isITSegment(candidateSegment) || isITSegment(candidateCategory) || roleIsIT;
      const candidateIsNonIT = isNonITSegment(candidateSegment) || isNonITSegment(candidateCategory);

      // Score jobs using matching algorithm with industry category as primary filter
      const scored: MatchedJob[] = allJobs.map((job) => {
        let score = 0;
        const matchReasons: string[] = [];

        // ─── INDUSTRY CATEGORY FILTER (hard gate) ─────────────────────────
        const jobSegment = (job.segment || "").toLowerCase();
        const jobInterviewType = ((job as any).interview_type || "").toLowerCase();
        const jobIsEducation = isEducationSegment(jobSegment) || jobInterviewType === "education" ||
          ["teacher", "principal", "princepal", "lecturer", "professor", "school", "tutor"].some((k) => job.job_title.toLowerCase().includes(k));
        const jobIsIT = isITSegment(jobSegment) || jobInterviewType === "it_corporate" ||
          ["software", "developer", "engineer", "data", "cloud", "cyber", "devops", "it ", "tech"].some((k) => job.job_title.toLowerCase().includes(k));

        // Hard cross-sector filter: if candidate is IT, skip education-only jobs entirely
        if (candidateIsIT && !candidateIsEducation && jobIsEducation && !jobIsIT) {
          return {
            id: job.id, job_title: job.job_title, location: job.location,
            department: job.department, salary_range: job.salary_range, employer_id: job.employer_id,
            matchScore: -999, matchReasons: [], applyStatus: "pending" as const,
          };
        }
        // Hard cross-sector filter: if candidate is Education, skip IT-only jobs
        if (candidateIsEducation && !candidateIsIT && jobIsIT && !jobIsEducation) {
          return {
            id: job.id, job_title: job.job_title, location: job.location,
            department: job.department, salary_range: job.salary_range, employer_id: job.employer_id,
            matchScore: -999, matchReasons: [], applyStatus: "pending" as const,
          };
        }

        // Segment exact match gives a strong bonus
        if (candidateSegment && jobSegment && candidateSegment === jobSegment) {
          score += 40;
          matchReasons.push("Industry category match");
        } else if (candidateIsIT && jobIsIT) {
          score += 30;
          matchReasons.push("IT industry match");
        } else if (candidateIsEducation && jobIsEducation) {
          score += 30;
          matchReasons.push("Education sector match");
        } else if (candidateIsNonIT && !jobIsEducation && !jobIsIT) {
          score += 20;
          matchReasons.push("Sector match");
        }

        // ─── PREFERRED ROLE / DESIGNATION MATCH ───────────────────────────
        if (activeProfile.preferred_role && job.job_title) {
          const pr = activeProfile.preferred_role.toLowerCase();
          const jt = job.job_title.toLowerCase();
          const desc = job.description?.toLowerCase() || "";
          const des = (job.designation || "").toLowerCase();
          if (jt.includes(pr) || pr.includes(jt) || des.includes(pr) || pr.includes(des)) {
            score += 30;
            matchReasons.push("Matches your preferred role");
          } else if (desc.includes(pr)) {
            score += 15;
            matchReasons.push("Related to your preferred role");
          }
        }

        // ─── SKILLS MATCH ─────────────────────────────────────────────────
        const jobSkills = job.skills as string[] | null;
        const resumeSkills = (activeAnalysis?.skill_highlights || []).map((s: string) => s.toLowerCase());
        const profileCategorySkills = candidateCategory ? [candidateCategory] : [];
        const allCandidateSkills = [...resumeSkills, ...profileCategorySkills];

        if (jobSkills && jobSkills.length > 0 && allCandidateSkills.length > 0) {
          const matched = jobSkills.filter((skill: string) =>
            allCandidateSkills.some((cs: string) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))
          );
          if (matched.length > 0) {
            score += Math.min(25, matched.length * 8);
            matchReasons.push(`${matched.length} skill${matched.length > 1 ? "s" : ""} matched`);
          }
        }

        // Category/domain keyword match in job description
        if (candidateCategory) {
          const catKeywords = candidateCategory.split(/[\s,/]+/).filter((k) => k.length > 3);
          const desc = (job.description || "").toLowerCase();
          const jt = job.job_title.toLowerCase();
          const matchedKeywords = catKeywords.filter((kw) => desc.includes(kw) || jt.includes(kw));
          if (matchedKeywords.length > 0) {
            score += Math.min(20, matchedKeywords.length * 7);
            matchReasons.push(`Domain match: ${matchedKeywords.slice(0, 2).join(", ")}`);
          }
        }

        // ─── LOCATION MATCH ────────────────────────────────────────────────
        if (job.location) {
          const loc = job.location.toLowerCase();
          if (activeProfile.preferred_district && loc.includes(activeProfile.preferred_district.toLowerCase())) {
            score += 20;
            matchReasons.push("Preferred location match");
          } else if (activeProfile.preferred_state && loc.includes(activeProfile.preferred_state.toLowerCase())) {
            score += 15;
            matchReasons.push("Same state");
          }
        }

        // ─── PRIMARY SUBJECT MATCH (education-specific) ───────────────────
        if (activeProfile.primary_subject && job.job_title) {
          const subj = activeProfile.primary_subject.toLowerCase();
          const jt = job.job_title.toLowerCase();
          const desc = job.description?.toLowerCase() || "";
          const jobSubj = (job.subjects || "").toLowerCase();
          if (jt.includes(subj) || jobSubj.includes(subj) || desc.includes(subj)) {
            score += 25;
            matchReasons.push("Subject expertise match");
          }
        }

        // ─── EXPERIENCE LEVEL MATCH ────────────────────────────────────────
        if (activeProfile.experience_level && job.experience_required) {
          const exp = activeProfile.experience_level.toLowerCase();
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

      // Filter and sort
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

    // Re-check plan + remaining quota at execution time so basic users (or
    // exhausted Pro users) never slip through stale UI state.
    if (!isPaidPlan) {
      toast({
        title: "Upgrade required",
        description: "AI Job Apply is available on the Pro and Premium plans.",
        variant: "destructive",
      });
      return;
    }

    const monthlyCap = aiApplyLimit; // Infinity for Premium, 5 for Pro
    let remainingThisRun = aiApplyRemaining;
    if (monthlyCap !== Infinity && remainingThisRun <= 0) {
      toast({
        title: "Monthly limit reached",
        description: `You've used all ${monthlyCap} AI Job Apply auto-runs this month. Upgrade to Premium for unlimited runs.`,
        variant: "destructive",
      });
      return;
    }

    setStep("applying");
    setTotalToApply(
      monthlyCap === Infinity
        ? jobsToApply.length
        : Math.min(jobsToApply.length, remainingThisRun),
    );
    setAppliedCount(0);
    let appliedThisRun = 0;

    for (let i = 0; i < matchedJobs.length; i++) {
      const job = matchedJobs[i];
      if (job.applyStatus !== "pending") continue;

      // Stop early once the monthly cap has been reached.
      if (monthlyCap !== Infinity && remainingThisRun <= 0) {
        toast({
          title: "Monthly limit reached",
          description: `Stopped after ${appliedThisRun} application${appliedThisRun === 1 ? "" : "s"} — your ${monthlyCap}/month AI Job Apply quota is now used up.`,
        });
        break;
      }

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

        // Record the AI Job Apply usage against the subscription quota.
        if (monthlyCap !== Infinity) {
          const ok = await sub.consume("ai_job_apply");
          if (!ok) {
            // Quota was exhausted between checks — mark as failed and stop.
            setMatchedJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, applyStatus: "failed" } : j)));
            break;
          }
          remainingThisRun -= 1;
        } else {
          // Premium: still record usage for analytics.
          await sub.consume("ai_job_apply");
        }

        setMatchedJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, applyStatus: "applied" } : j)));
        setAppliedCount((c) => c + 1);
        appliedThisRun += 1;
        setExistingApplicationJobIds((prev) => new Set([...prev, job.id]));
      } catch (err) {
        console.error("Apply error for job", job.id, err);
        setMatchedJobs((prev) => prev.map((j, idx) => (idx === i ? { ...j, applyStatus: "failed" } : j)));
      }
    }

    setApplyingIndex(-1);
    toast({
      title: "Auto-Apply Complete",
      description: `Successfully applied to ${appliedThisRun} job${appliedThisRun === 1 ? "" : "s"}!`,
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
              <p className="text-lg font-bold text-foreground">₹15,000<span className="text-xs text-muted-foreground font-normal">/month</span></p>
              <p className="text-xs text-muted-foreground mt-1">10 auto-applies/month</p>
            </Card>
            <Card className="p-4 border-primary/20 bg-primary/5 text-left max-w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Premium Plan</span>
              </div>
              <p className="text-lg font-bold text-foreground">₹30,000<span className="text-xs text-muted-foreground font-normal">/month</span></p>
              <p className="text-xs text-muted-foreground mt-1">Unlimited auto-applies</p>
            </Card>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button onClick={onNavigateToUpgrade} className="gap-2">
              <Crown className="h-4 w-4" />
              Upgrade Now
            </Button>
            <Button
              variant="outline"
              onClick={handlePurchaseDayPass}
              disabled={isPurchasingDayPass}
              className="gap-2"
            >
              {isPurchasingDayPass ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Unlock 1 Day — ₹{DAY_PASS_POINTS}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Pay ₹{DAY_PASS_POINTS} from your wallet to unlock AI Job Apply for 24 hours.
          </p>
        </Card>
      </div>
    );
  }

  // Step 1: Upload resume inline (no redirect)
  if (!hasResume || !hasAnalysis) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI Job Apply</h2>
          <p className="text-sm text-muted-foreground">Let AI automatically apply to jobs that match your profile</p>
        </div>
        <Card className="p-8 text-center border-dashed border-2 border-primary/30">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleInlineResumeUpload}
            className="hidden"
          />
          {isUploadingResume ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Analyzing your resume...</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                AI is reading your resume to detect your skills and find matching jobs.
              </p>
            </>
          ) : (
            <>
              <FileUp className="h-12 w-12 mx-auto mb-4 text-primary/60" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Upload Your Resume</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Upload your resume and our AI will instantly detect your skills, experience and find the best matching jobs for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Resume
                </Button>
                <Button variant="outline" onClick={onNavigateToResume} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Build Resume First
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">Supports PDF, Word (.doc/.docx), and image files</p>
            </>
          )}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      AI Job Apply this month:{" "}
                      <span className="font-medium text-foreground">
                        {aiApplyUsed}
                        {" / "}
                        {aiApplyLimit === Infinity ? "∞" : aiApplyLimit}
                      </span>
                      {aiApplyLimit !== Infinity && (
                        <> · {aiApplyRemaining} remaining</>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={autoApplyAll}
                    disabled={
                      step === "applying" ||
                      matchedJobs.filter((j) => j.applyStatus === "pending").length === 0 ||
                      (aiApplyLimit !== Infinity && aiApplyRemaining <= 0)
                    }
                    className="gap-2"
                  >
                    {step === "applying" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying... ({appliedCount}/{totalToApply})
                      </>
                    ) : aiApplyLimit !== Infinity && aiApplyRemaining <= 0 ? (
                      <>
                        <Lock className="h-4 w-4" />
                        Monthly Limit Reached
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
