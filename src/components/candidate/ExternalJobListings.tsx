import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Building2, Loader2, IndianRupee, Globe, User, Phone, Mail, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExternalJob {
  id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  experience_required: string | null;
  description: string | null;
  skills: string[];
  apply_url: string;
  company_logo_url: string | null;
  hr_name: string | null;
  hr_contact: string | null;
  hr_email: string | null;
}

const UNLOCK_POINTS = 4; // ₹20 = 4 points (₹5 per point)
const UNLOCK_AMOUNT = UNLOCK_POINTS * 5;

const ExternalJobListings = () => {
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [hrModalJob, setHrModalJob] = useState<ExternalJob | null>(null);
  const [confirmJob, setConfirmJob] = useState<ExternalJob | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: jobsData } = await supabase
        .from("external_jobs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (jobsData) setJobs(jobsData as ExternalJob[]);

      if (user?.id) {
        const { data: unlocks } = await supabase
          .from("external_job_unlocks")
          .select("external_job_id")
          .eq("candidate_id", user.id);
        if (unlocks) setUnlockedIds(new Set(unlocks.map((u: any) => u.external_job_id)));
      }

      setLoading(false);
    };
    init();
  }, []);

  const handleApplyClick = (job: ExternalJob) => {
    if (unlockedIds.has(job.id)) {
      setHrModalJob(job);
      if (job.apply_url) window.open(job.apply_url, "_blank", "noopener,noreferrer");
      return;
    }
    setConfirmJob(job);
  };

  const handleConfirmUnlock = async () => {
    if (!confirmJob || !userId) {
      toast.error("Please sign in to apply");
      return;
    }
    setProcessing(true);
    try {
      const { data: wallet, error: wErr } = await supabase
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (wErr || !wallet) {
        toast.error("Wallet not found. Please add funds.");
        return;
      }
      if ((wallet.points_balance ?? 0) < UNLOCK_POINTS) {
        toast.error(`Insufficient balance. You need ₹${UNLOCK_AMOUNT} to apply.`);
        return;
      }

      const newBalance = (wallet.points_balance ?? 0) - UNLOCK_POINTS;
      const { error: uErr } = await supabase
        .from("wallets")
        .update({ points_balance: newBalance })
        .eq("id", wallet.id);
      if (uErr) throw uErr;

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "external_job_apply",
        points: -UNLOCK_POINTS,
        amount: UNLOCK_AMOUNT,
        description: `Applied to ${confirmJob.job_title} at ${confirmJob.company_name}`,
        reference_id: confirmJob.id,
      });

      const { error: insErr } = await supabase.from("external_job_unlocks").insert({
        candidate_id: userId,
        external_job_id: confirmJob.id,
        points_spent: UNLOCK_POINTS,
      });
      if (insErr && !insErr.message.includes("duplicate")) throw insErr;

      setUnlockedIds(prev => new Set(prev).add(confirmJob.id));
      toast.success(`₹${UNLOCK_AMOUNT} deducted. HR contact unlocked!`);

      const job = confirmJob;
      setConfirmJob(null);
      setHrModalJob(job);
      if (job.apply_url) window.open(job.apply_url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message || "Could not process payment");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">External Job Listings</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse openings from external companies. Applying costs <strong>₹{UNLOCK_AMOUNT}</strong> from your wallet and unlocks the HR contact details for that job.
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No external job listings available at the moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => {
            const unlocked = unlockedIds.has(job.id);
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
                <CardContent className="p-4 flex flex-col flex-1 gap-3">
                  <div className="flex items-start gap-3">
                    {job.company_logo_url ? (
                      <img src={job.company_logo_url} alt={job.company_name} className="h-10 w-10 rounded-lg object-contain border border-border" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2">{job.job_title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.company_name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">External</Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {job.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                    )}
                    {job.experience_required && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.experience_required}</span>
                    )}
                    {job.salary_range && (
                      <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{job.salary_range}</span>
                    )}
                    {job.job_type && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.job_type.replace("-", " ")}</Badge>
                    )}
                  </div>

                  {job.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                  )}

                  {job.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 4).map(s => (
                        <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                      ))}
                      {job.skills.length > 4 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{job.skills.length - 4}</Badge>
                      )}
                    </div>
                  )}

                  {(job.hr_name || job.hr_contact) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground border-t pt-2">
                      <span className="font-medium text-foreground">HR Contact</span>
                      <span>-</span>
                      {job.hr_name && (
                        <span className={`flex items-center gap-1 ${unlocked ? "" : "blur-[4px] select-none"}`}>
                          <User className="h-3 w-3 blur-none" /> {job.hr_name}
                        </span>
                      )}
                      {job.hr_contact && (
                        <span className={`flex items-center gap-1 ${unlocked ? "" : "blur-[4px] select-none"}`}>
                          <Phone className="h-3 w-3 blur-none" /> {job.hr_contact}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-2">
                    <Button
                      size="sm"
                      className="w-full gap-2 text-xs"
                      variant={unlocked ? "outline" : "default"}
                      onClick={() => handleApplyClick(job)}
                    >
                      {unlocked ? (
                        <>
                          <Phone className="h-3.5 w-3.5" />
                          View HR Contact
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Apply (₹{UNLOCK_AMOUNT})
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm payment dialog */}
      <Dialog open={!!confirmJob} onOpenChange={(open) => !open && !processing && setConfirmJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for this job?</DialogTitle>
            <DialogDescription>
              <strong>₹{UNLOCK_AMOUNT}</strong> will be deducted from your wallet to apply and unlock the HR contact details for{" "}
              <span className="font-medium text-foreground">{confirmJob?.job_title}</span> at{" "}
              <span className="font-medium text-foreground">{confirmJob?.company_name}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmJob(null)} disabled={processing}>Cancel</Button>
            <Button onClick={handleConfirmUnlock} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ₹${UNLOCK_AMOUNT}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HR contact dialog (after unlock) */}
      <Dialog open={!!hrModalJob} onOpenChange={(open) => !open && setHrModalJob(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">HR Contact Details</DialogTitle>
          </DialogHeader>
          {hrModalJob && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium">{hrModalJob.job_title} — {hrModalJob.company_name}</p>
              {hrModalJob.hr_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{hrModalJob.hr_name}</span>
                </div>
              )}
              {hrModalJob.hr_contact && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${hrModalJob.hr_contact}`} className="text-primary underline">{hrModalJob.hr_contact}</a>
                </div>
              )}
              {hrModalJob.hr_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${hrModalJob.hr_email}`} className="text-primary underline">{hrModalJob.hr_email}</a>
                </div>
              )}
              {!hrModalJob.hr_name && !hrModalJob.hr_contact && !hrModalJob.hr_email && (
                <p className="text-sm text-muted-foreground">No HR contact details available for this job.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExternalJobListings;
