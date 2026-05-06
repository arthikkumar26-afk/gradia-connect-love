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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
}

interface MyVacanciesContentProps {
  /** Override the employer whose vacancies are loaded (used for HR posting on behalf of an employer). */
  employerIdOverride?: string;
  /** Hide the wallet badge and unlock-pricing copy when in HR mode. */
  hideWallet?: boolean;
}

export const MyVacanciesContent = ({ employerIdOverride, hideWallet = false }: MyVacanciesContentProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const effectiveEmployerId = employerIdOverride || user?.id;
  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<VacancyRow | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState<ApplicantRow | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [walletPoints, setWalletPoints] = useState<number>(0);
  const [profileView, setProfileView] = useState<ApplicantRow | null>(null);

  const loadVacancies = async () => {
    if (!effectiveEmployerId) return;
    setLoading(true);
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, job_title, location, status, job_type, created_at")
      .eq("employer_id", effectiveEmployerId)
      .order("created_at", { ascending: false });

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
  }, [effectiveEmployerId]);

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

    // Get candidate profiles + unlocks in parallel
    const [{ data: profiles }, { data: unlocks }] = await Promise.all([
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
    ]);

    const unlockedAppIds = new Set(
      (unlocks || []).map((u: any) => u.application_id).filter(Boolean)
    );
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const rows: ApplicantRow[] = apps.map((a: any) => {
      const p: any = profileMap.get(a.candidate_id) || {};
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
      };
    });

    setApplicants(rows);
    setLoadingApps(false);
  };

  const handleUnlock = async () => {
    if (!confirmUnlock || !selectedJob || !user?.id) return;
    setUnlocking(true);

    try {
      // Refetch wallet to ensure latest balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet) {
        toast({
          title: "Wallet not found",
          description: "Please load points into your wallet first.",
          variant: "destructive",
        });
        setUnlocking(false);
        return;
      }

      if ((wallet.points_balance || 0) < UNLOCK_COST) {
        toast({
          title: "Insufficient points",
          description: `You need ${UNLOCK_COST} pts. Current balance: ${wallet.points_balance || 0} pts.`,
          variant: "destructive",
        });
        setUnlocking(false);
        return;
      }

      // Deduct points
      const newBalance = (wallet.points_balance || 0) - UNLOCK_COST;
      const { error: updErr } = await supabase
        .from("wallets")
        .update({ points_balance: newBalance })
        .eq("id", wallet.id);
      if (updErr) throw updErr;

      // Record transaction
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "cv_unlock",
        points: UNLOCK_COST,
        description: `Unlocked CV: ${confirmUnlock.full_name || "Candidate"} for ${selectedJob.job_title}`,
      });

      // Insert unlock record (per application, not per candidate)
      const { error: unlockErr } = await supabase.from("cv_unlocks").insert({
        employer_id: user.id,
        candidate_id: confirmUnlock.candidate_id,
        job_id: selectedJob.id,
        application_id: confirmUnlock.applicationId,
        points_spent: UNLOCK_COST,
      });
      if (unlockErr && !unlockErr.message?.includes("duplicate")) throw unlockErr;

      // Update local state — match by applicationId so duplicate-candidate rows don't all flip
      setApplicants((prev) =>
        prev.map((a) =>
          a.applicationId === confirmUnlock.applicationId ? { ...a, unlocked: true } : a
        )
      );
      setWalletPoints(newBalance);
      toast({
        title: "CV Unlocked!",
        description: `${UNLOCK_COST} pts deducted. New balance: ${newBalance} pts.`,
      });
      setConfirmUnlock(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Failed to unlock CV",
        variant: "destructive",
      });
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
                {applicants.map((a) => (
                  <div
                    key={a.applicationId}
                    className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
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

                      <div className="flex flex-col gap-2 shrink-0">
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
                            onClick={() => setConfirmUnlock(a)}
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

        <Dialog open={!!confirmUnlock} onOpenChange={(o) => !o && setConfirmUnlock(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unlock Candidate CV?</DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-foreground">{UNLOCK_COST} pts</span> will be
                deducted from your wallet to view this candidate's full details and download their
                CV.
                <br />
                <br />
                Current balance: <span className="font-semibold">{walletPoints} pts</span>
                <br />
                After unlock: <span className="font-semibold">{walletPoints - UNLOCK_COST} pts</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmUnlock(null)} disabled={unlocking}>
                Cancel
              </Button>
              <Button onClick={handleUnlock} disabled={unlocking}>
                {unlocking ? "Processing..." : `Confirm & Pay ${UNLOCK_COST} pts`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FullCandidateProfileDialog
          open={!!profileView}
          onClose={() => setProfileView(null)}
          candidateId={profileView?.candidate_id || null}
          resumeUrl={profileView?.resume_url || null}
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
        {!hideWallet && (
          <Badge variant="secondary" className="text-sm px-3 py-1.5">
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            {walletPoints} pts
          </Badge>
        )}
      </div>

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
