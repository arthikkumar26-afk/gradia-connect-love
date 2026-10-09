import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Users,
  MapPin,
  FileText,
  ArrowLeft,
  Lock,
  Unlock,
  Mail,
  Phone,
  Download,
  Eye,
  Wallet,
  Plus,
} from "lucide-react";
import { InlineJobCreationForm } from "./InlineJobCreationForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import FullCandidateProfileDialog from "./FullCandidateProfileDialog";

const UNLOCK_COST = 10; // points to unlock one CV

interface VacancyRow {
  id: string;
  job_title: string;
  location: string | null;
  status: string | null;
  job_type: string | null;
  created_at: string | null;
  applicationCount: number;
}

interface ApplicantRow {
  applicationId: string;
  candidate_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  resume_url: string | null;
  applied_date: string | null;
  status: string | null;
  unlocked: boolean;
  screeningStatus: string | null;
  screeningSentAt: string | null;
}

interface MyVacanciesContentProps {
  /** Override the employer whose vacancies are loaded (used for HR posting on behalf of an employer). */
  employerIdOverride?: string;
  /** Multi-employer override (HR Manager). When set, loads jobs across all listed employers. */
  employerIdsOverride?: string[];
  /** Hide the wallet badge and unlock-pricing copy when in HR mode. */
  hideWallet?: boolean;
  /** Employer organisation name shown when HR creates a vacancy on behalf of an employer. */
  employerNameOverride?: string;
  /** Paid Vacancies view: candidate profiles show the payment request panel. */
  paymentMode?: boolean;
}

export const MyVacanciesContent = ({ employerIdOverride, employerIdsOverride, hideWallet = false, employerNameOverride, paymentMode = false }: MyVacanciesContentProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMultiEmployer = !!employerIdsOverride && employerIdsOverride.length > 0;
  const effectiveEmployerId = employerIdOverride || user?.id;
  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<VacancyRow | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState<ApplicantRow[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unlocking, setUnlocking] = useState(false);
  const [walletPoints, setWalletPoints] = useState<number>(0);
  const [profileView, setProfileView] = useState<ApplicantRow | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadVacancies = async () => {
    setLoading(true);
    let jobsQuery = supabase
      .from("jobs")
      .select("id, job_title, location, status, job_type, created_at")
      .order("created_at", { ascending: false });
    if (isMultiEmployer) {
      jobsQuery = jobsQuery.in("employer_id", employerIdsOverride!);
    } else {
      if (!effectiveEmployerId) { setVacancies([]); setLoading(false); return; }
      jobsQuery = jobsQuery.eq("employer_id", effectiveEmployerId);
    }
    const { data: jobs } = await jobsQuery;

    if (!jobs) {
      setVacancies([]);
      setLoading(false);
      return;
    }

    const ids = jobs.map((j) => j.id);
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: apps } = await supabase
        .from("applications")
        .select("job_id")
        .in("job_id", ids);
      (apps || []).forEach((a: any) => {
        counts[a.job_id] = (counts[a.job_id] || 0) + 1;
      });
    }

    setVacancies(jobs.map((j) => ({ ...j, applicationCount: counts[j.id] || 0 })));
    setLoading(false);
  };

  const loadWallet = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("wallets")
      .select("points_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setWalletPoints(data?.points_balance || 0);
  };

  useEffect(() => {
    loadVacancies();
    loadWallet();
  }, [effectiveEmployerId, (employerIdsOverride || []).join(",")]);

  const openJob = async (job: VacancyRow) => {
    setSelectedJob(job);
    setLoadingApps(true);

    // Get applications
    const { data: apps } = await supabase
      .from("applications")
      .select("id, candidate_id, applied_date, status")
      .eq("job_id", job.id)
      .order("applied_date", { ascending: false });

    if (!apps || apps.length === 0) {
      setApplicants([]);
      setLoadingApps(false);
      return;
    }

    const candidateIds = apps.map((a: any) => a.candidate_id);

    // Get candidate profiles + unlocks + AI screening sessions in parallel
    const [{ data: profiles }, { data: unlocks }, { data: screenings }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, mobile, location, resume_url")
        .in("id", candidateIds),
      supabase
        .from("cv_unlocks")
        .select("application_id, candidate_id")
        .eq("employer_id", effectiveEmployerId!)
        .eq("job_id", job.id)
        .in("candidate_id", candidateIds),
      supabase
        .from("mock_interview_sessions")
        .select("candidate_id, status, created_at")
        .eq("interview_type", "ai_screening")
        .in("candidate_id", candidateIds)
        .order("created_at", { ascending: false }),
    ]);

    // Latest screening session per candidate
    const screeningMap = new Map<string, { status: string; created_at: string }>();
    (screenings || []).forEach((s: any) => {
      if (!screeningMap.has(s.candidate_id)) {
        screeningMap.set(s.candidate_id, { status: s.status, created_at: s.created_at });
      }
    });

    const unlockedAppIds = new Set(
      (unlocks || []).map((u: any) => u.application_id).filter(Boolean)
    );
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const rows: ApplicantRow[] = apps.map((a: any) => {
      const p: any = profileMap.get(a.candidate_id) || {};
      const screening = screeningMap.get(a.candidate_id);
      return {
        applicationId: a.id,
        candidate_id: a.candidate_id,
        full_name: p.full_name || null,
        email: p.email || null,
        phone: p.mobile || null,
        location: p.location || null,
        resume_url: p.resume_url || null,
        applied_date: a.applied_date,
        status: a.status,
        unlocked: unlockedAppIds.has(a.id),
        screeningStatus: screening?.status || null,
        screeningSentAt: screening?.created_at || null,
      };
    });

    setApplicants(rows);
    setLoadingApps(false);
  };

  const lockedApplicants = applicants.filter((a) => !a.unlocked);
  const selectedLocked = lockedApplicants.filter((a) => selectedIds.has(a.applicationId));
  const confirmCost = (confirmUnlock?.length || 0) * UNLOCK_COST;

  const handleUnlock = async () => {
    if (!confirmUnlock?.length || !selectedJob || !user?.id) return;
    const targets = confirmUnlock.filter((a) => !a.unlocked);
    const cost = targets.length * UNLOCK_COST;
    setUnlocking(true);

    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet) {
        toast({ title: "Wallet not found", description: "Please load points into your wallet first.", variant: "destructive" });
        return;
      }
      if ((wallet.points_balance || 0) < cost) {
        toast({
          title: "Insufficient points",
          description: `You need ${cost} pts. Current balance: ${wallet.points_balance || 0} pts.`,
          variant: "destructive",
        });
        return;
      }

      // Insert unlock records first (unique constraint protects against double-charge)
      const { error: unlockErr } = await supabase.from("cv_unlocks").insert(
        targets.map((a) => ({
          employer_id: user.id,
          candidate_id: a.candidate_id,
          job_id: selectedJob.id,
          application_id: a.applicationId,
          points_spent: UNLOCK_COST,
        }))
      );
      if (unlockErr && !unlockErr.message?.includes("duplicate")) throw unlockErr;

      const newBalance = (wallet.points_balance || 0) - cost;
      const { error: updErr } = await supabase
        .from("wallets")
        .update({ points_balance: newBalance })
        .eq("id", wallet.id);
      if (updErr) throw updErr;

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "cv_unlock",
        points: cost,
        description:
          targets.length === 1
            ? `Unlocked CV: ${targets[0].full_name || "Candidate"} for ${selectedJob.job_title}`
            : `Unlocked ${targets.length} CVs for ${selectedJob.job_title}`,
      });

      const ids = new Set(targets.map((a) => a.applicationId));
      setApplicants((prev) => prev.map((a) => (ids.has(a.applicationId) ? { ...a, unlocked: true } : a)));
      setSelectedIds(new Set());
      setWalletPoints(newBalance);
      toast({
        title: targets.length === 1 ? "CV Unlocked!" : `${targets.length} CVs Unlocked!`,
        description: `${cost} pts deducted. New balance: ${newBalance} pts.`,
      });
      setConfirmUnlock(null);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Failed to unlock CV", variant: "destructive" });
    } finally {
      setUnlocking(false);
    }
  };

  const openResume = async (url: string, download: boolean) => {
    try {
      // Extract path inside the resumes bucket from a public-style URL
      const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/resumes\/(.+?)(?:\?|$)/);
      const path = match ? decodeURIComponent(match[1]) : null;

      let finalUrl = url;
      if (path) {
        const { data, error } = await supabase.storage
          .from("resumes")
          .createSignedUrl(path, 60 * 60, download ? { download: true } : undefined);
        if (error) throw error;
        finalUrl = data.signedUrl;
      }

      if (download) {
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = "";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(finalUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Could not open CV",
        description: err.message || "Resume file is unavailable.",
        variant: "destructive",
      });
    }
  };

  const total = vacancies.reduce((s, v) => s + v.applicationCount, 0);
  const withApps = vacancies.filter((v) => v.applicationCount > 0);

  // ======== APPLICANTS VIEW ========
  if (selectedJob) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h2 className="text-xl font-bold text-foreground">{selectedJob.job_title}</h2>
              <p className="text-xs text-muted-foreground">
                {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
                {!hideWallet && <> • Unlock cost: {UNLOCK_COST} pts per CV</>}
              </p>
            </div>
          </div>
          {!hideWallet && (
            <Badge variant="secondary" className="text-sm px-3 py-1.5">
              <Wallet className="h-3.5 w-3.5 mr-1.5" />
              {walletPoints} pts
            </Badge>
          )}
        </div>

        <Card>
          <CardContent className="p-4">
            {loadingApps ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : applicants.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No applications received yet for this vacancy.
              </p>
            ) : (
              <div className="space-y-3">
                {lockedApplicants.length > 0 && (
                  <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg bg-muted/40 border border-border px-3 py-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={
                          selectedLocked.length === lockedApplicants.length
                            ? true
                            : selectedLocked.length > 0
                            ? "indeterminate"
                            : false
                        }
                        onCheckedChange={(c) =>
                          setSelectedIds(
                            c === true ? new Set(lockedApplicants.map((x) => x.applicationId)) : new Set()
                          )
                        }
                      />
                      Select all locked ({lockedApplicants.length})
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={selectedLocked.length === 0}
                        onClick={() => setConfirmUnlock(selectedLocked)}
                      >
                        <Unlock className="h-3.5 w-3.5 mr-1" />
                        Unlock selected ({selectedLocked.length}) · {selectedLocked.length * UNLOCK_COST} pts
                      </Button>
                      <Button size="sm" onClick={() => setConfirmUnlock(lockedApplicants)}>
                        <Unlock className="h-3.5 w-3.5 mr-1" />
                        Unlock all profiles · {lockedApplicants.length * UNLOCK_COST} pts
                      </Button>
                    </div>
                  </div>
                )}
                {applicants.map((a) => (
                  <div
                    key={a.applicationId}
                    onClick={a.unlocked ? () => setProfileView(a) : undefined}
                    className={`border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors ${a.unlocked ? "cursor-pointer" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {!a.unlocked && (
                            <Checkbox
                              onClick={(e) => e.stopPropagation()}
                              checked={selectedIds.has(a.applicationId)}
                              onCheckedChange={(c) =>
                                setSelectedIds((prev) => {
                                  const n = new Set(prev);
                                  c === true ? n.add(a.applicationId) : n.delete(a.applicationId);
                                  return n;
                                })
                              }
                              aria-label="Select profile"
                            />
                          )}
                          {a.unlocked ? (
                            <button
                              type="button"
                              onClick={() => setProfileView(a)}
                              className="font-semibold text-foreground hover:text-primary hover:underline text-left"
                            >
                              {a.full_name || "Candidate"}
                            </button>
                          ) : (
                            <h3 className="font-semibold text-foreground">🔒 Locked Profile</h3>
                          )}
                          {a.unlocked ? (
                            <Badge variant="default" className="text-xs">
                              <Unlock className="h-3 w-3 mr-1" /> Unlocked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" /> Locked
                            </Badge>
                          )}
                          {a.screeningStatus && (
                            <Badge
                              variant={a.screeningStatus === "completed" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              AI Screening:{" "}
                              {a.screeningStatus === "completed"
                                ? "Completed"
                                : a.screeningStatus === "in_progress"
                                  ? "In progress"
                                  : "Sent"}
                            </Badge>
                          )}
                        </div>

                        {a.unlocked ? (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {a.email && (
                              <p className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" /> {a.email}
                              </p>
                            )}
                            {a.phone && (
                              <p className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" /> {a.phone}
                              </p>
                            )}
                            {a.location && (
                              <p className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> {a.location}
                              </p>
                            )}
                            {a.applied_date && (
                              <p className="text-xs">
                                Applied: {new Date(a.applied_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Candidate details and CV are hidden. Pay{" "}
                            <span className="font-semibold text-foreground">{UNLOCK_COST} pts</span>{" "}
                            to view full profile and download CV.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {a.unlocked ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setProfileView(a)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> View Profile
                            </Button>
                            {a.resume_url ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openResume(a.resume_url!, false)}
                                >
                                  <FileText className="h-3.5 w-3.5 mr-1" /> View CV
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openResume(a.resume_url!, true)}
                                >
                                  <Download className="h-3.5 w-3.5 mr-1" /> Download
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                No CV uploaded
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setConfirmUnlock([a])}
                            disabled={walletPoints < UNLOCK_COST}
                          >
                            <Unlock className="h-3.5 w-3.5 mr-1" />
                            Unlock for {UNLOCK_COST} pts
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!confirmUnlock} onOpenChange={(o) => !o && !unlocking && setConfirmUnlock(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Unlock {confirmUnlock && confirmUnlock.length > 1 ? `${confirmUnlock.length} Candidate CVs` : "Candidate CV"}?
              </DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-foreground">{confirmCost} pts</span> will be
                deducted from your wallet ({UNLOCK_COST} pts × {confirmUnlock?.length || 0}) to view
                full details and download CVs.
                <br />
                <br />
                Current balance: <span className="font-semibold">{walletPoints} pts</span>
                <br />
                After unlock: <span className="font-semibold">{walletPoints - confirmCost} pts</span>
                {walletPoints < confirmCost && (
                  <span className="block text-destructive mt-2">Insufficient balance.</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmUnlock(null)} disabled={unlocking}>
                Cancel
              </Button>
              <Button onClick={handleUnlock} disabled={unlocking || walletPoints < confirmCost}>
                {unlocking ? "Processing..." : `Confirm & Pay ${confirmCost} pts`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FullCandidateProfileDialog
          open={!!profileView}
          onClose={() => setProfileView(null)}
          candidateId={profileView?.candidate_id || null}
          resumeUrl={profileView?.resume_url || null}
          jobTitle={selectedJob?.job_title || null}
          jobId={selectedJob?.id || null}
          paymentMode={paymentMode}
        />
      </div>
    );
  }

  // ======== VACANCIES LIST VIEW ========
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Vacancies List</h2>
          <p className="text-sm text-muted-foreground">
            Click a vacancy to view received resumes
            {!hideWallet && <> • {UNLOCK_COST} pts per CV unlock</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hideWallet && (
            <Badge variant="secondary" className="text-sm px-3 py-1.5">
              <Wallet className="h-3.5 w-3.5 mr-1.5" />
              {walletPoints} pts
            </Badge>
          )}
          <Button
            variant={showCreateForm ? "outline" : "default"}
            size="sm"
            onClick={() => setShowCreateForm((s) => !s)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? "Close" : "Create Vacancy"}
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardContent className="p-4">
            <InlineJobCreationForm
              employerIdOverride={employerIdOverride}
              employerNameOverride={employerNameOverride}
              onJobCreated={() => {
                setShowCreateForm(false);
                loadVacancies();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{vacancies.length}</p>
              <p className="text-xs text-muted-foreground">Total Vacancies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total CVs Received</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{withApps.length}</p>
              <p className="text-xs text-muted-foreground">Vacancies with Applicants</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vacancies & CVs Received</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : vacancies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No vacancies posted yet.
            </p>
          ) : (
            <div className="space-y-2">
              {vacancies.map((v) => (
                <button
                  key={v.id}
                  onClick={() => openJob(v)}
                  className="w-full text-left flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/40 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{v.job_title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {v.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {v.location}
                          </span>
                        )}
                        {v.job_type && <span>• {v.job_type}</span>}
                        <Badge
                          variant={v.status === "active" ? "default" : "secondary"}
                          className="ml-1"
                        >
                          {v.status || "unknown"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={v.applicationCount > 0 ? "default" : "outline"}
                      className="text-sm px-3 py-1"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {v.applicationCount} {v.applicationCount === 1 ? "CV" : "CVs"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
