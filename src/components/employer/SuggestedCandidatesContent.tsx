import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Briefcase, MapPin, Mail, Phone, Users, GraduationCap, IndianRupee, Lock, Coins, ExternalLink, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useCandidatesTransferredToEmployer } from "@/hooks/useHRTransfers";

const PROFILE_UNLOCK_COST = 200;

interface JobItem {
  id: string;
  job_title: string;
  department: string | null;
  location: string | null;
  skills: string[] | null;
  experience_required: string | null;
  status?: string | null;
  preferred_role?: string | null;
}

interface CandidateRow {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  location: string | null;
  preferred_role: string | null;
  experience_level: string | null;
  primary_subject: string | null;
  profile_picture: string | null;
  expected_salary: number | null;
}

interface ScoredCandidate extends CandidateRow {
  score: number;
  reasons: string[];
}

const norm = (s?: string | null) => (s || "").toLowerCase().trim();

const scoreCandidate = (c: CandidateRow, job: JobItem): ScoredCandidate => {
  let score = 0;
  const reasons: string[] = [];

  const jobTitle = norm(job.job_title);
  const candRole = norm(c.preferred_role);

  if (jobTitle && candRole && (jobTitle.includes(candRole) || candRole.includes(jobTitle))) {
    score += 50;
    reasons.push("Role match");
  }

  if (job.location && c.location && norm(c.location).includes(norm(job.location).split(",")[0])) {
    score += 20;
    reasons.push("Location match");
  }

  if (c.primary_subject && jobTitle.includes(norm(c.primary_subject))) {
    score += 15;
    reasons.push("Subject match");
  }

  if (job.experience_required && c.experience_level) {
    if (norm(c.experience_level) === norm(job.experience_required)) {
      score += 15;
      reasons.push("Experience match");
    }
  }

  return { ...c, score, reasons };
};

export const SuggestedCandidatesContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { map: transferMap, loading: transferLoading } = useCandidatesTransferredToEmployer(user?.id);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCandidate, setOpenCandidate] = useState<ScoredCandidate | null>(null);
  const [unlockedProfiles, setUnlockedProfiles] = useState<Set<string>>(new Set());
  const [unlocking, setUnlocking] = useState(false);

  // Preload prior profile unlocks
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("wallet_transactions")
        .select("description")
        .eq("category", "candidate_profile_unlock");
      if (data) {
        const ids = new Set<string>();
        data.forEach((r: any) => {
          const m = String(r.description || "").match(/\[cid:([0-9a-f-]+)\]/i);
          if (m) ids.add(m[1]);
        });
        setUnlockedProfiles(ids);
      }
    })();
  }, [user?.id]);

  const unlockContact = async (c: ScoredCandidate) => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }
    if (unlockedProfiles.has(c.id)) return;
    setUnlocking(true);
    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!wallet) {
        toast.error("Wallet not found. Please load points first.");
        return;
      }
      const balance = wallet.points_balance ?? 0;
      if (balance < PROFILE_UNLOCK_COST) {
        toast.error(`Insufficient points. Need ${PROFILE_UNLOCK_COST} pts, have ${balance} pts.`);
        return;
      }
      const { error: updErr } = await supabase
        .from("wallets")
        .update({ points_balance: balance - PROFILE_UNLOCK_COST })
        .eq("id", wallet.id);
      if (updErr) throw updErr;

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "candidate_profile_unlock",
        amount: 0,
        points: PROFILE_UNLOCK_COST,
        description: `Profile unlocked for ${c.full_name} [cid:${c.id}]`,
      });

      setUnlockedProfiles((prev) => new Set(prev).add(c.id));
      toast.success(`${PROFILE_UNLOCK_COST} pts deducted. Contact details unlocked.`);
    } catch (err: any) {
      console.error("Profile unlock error:", err);
      toast.error(err.message || "Failed to deduct points");
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);

      const [jobsRes, candRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, job_title, department, location, skills, experience_required, status")
          .eq("employer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, email, mobile, location, preferred_role, experience_level, primary_subject, profile_picture, expected_salary")
          .eq("role", "candidate")
          .limit(500),
      ]);

      const jobList = (jobsRes.data as JobItem[]) || [];
      setJobs(jobList);
      setCandidates((candRes.data as CandidateRow[]) || []);
      if (jobList.length > 0) setSelectedJobId(jobList[0].id);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const matched: ScoredCandidate[] = useMemo(() => {
    if (!selectedJob) return [];
    // Only HR-transferred candidates are eligible
    const allowed = candidates.filter((c) => !!transferMap[c.id]);
    const scored = allowed
      .map((c) => scoreCandidate(c, selectedJob))
      .sort((a, b) => b.score - a.score);
    const withScore = scored.filter((c) => c.score > 0);
    // Fallback: if no scored matches, still surface top transferred candidates
    return (withScore.length > 0 ? withScore : scored).slice(0, 50);
  }, [candidates, selectedJob, transferMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Suggested Candidates
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick one of your vacancies to see candidates that best match its requirements.
          </p>
        </div>
        <div className="min-w-[260px]">
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a vacancy" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.job_title}
                  {j.department ? ` · ${j.department}` : ""}
                  {j.status ? ` (${j.status})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedJob && (
        <Card className="p-4 bg-muted/30">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedJob.job_title}</span>
            {selectedJob.location && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {selectedJob.location}
              </span>
            )}
            {selectedJob.experience_required && (
              <Badge variant="secondary">{selectedJob.experience_required}</Badge>
            )}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading || transferLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading suggestions…</div>
        ) : !selectedJob ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Post or activate a vacancy to see suggested candidates.
          </div>
        ) : matched.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Users className="h-8 w-8 opacity-40" />
            <p className="font-medium text-foreground">No transferred candidates yet</p>
            <p className="text-xs max-w-sm">
              Suggestions appear once an HR Recruiter or HR Manager transfers candidates to your account.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Role / Subject</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matched.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setOpenCandidate(c)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={c.profile_picture || undefined} />
                        <AvatarFallback>{c.full_name?.[0] || "C"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="font-medium text-sm hover:text-primary hover:underline block">{c.full_name}</span>
                        {transferMap[c.id] && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <UserCheck className="h-2.5 w-2.5 text-primary" />
                            HR: {transferMap[c.id].hr_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.preferred_role || c.primary_subject || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.location || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{c.experience_level || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className="bg-primary/10 text-primary border-primary/20 w-fit">
                        {Math.min(100, c.score)}% match
                      </Badge>
                      {c.reasons.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {c.reasons.join(" • ")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {unlockedProfiles.has(c.id) ? (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); window.open(`mailto:${c.email}`); }}
                          title={c.email}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        {c.mobile && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); window.open(`tel:${c.mobile}`); }}
                            title={c.mobile}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        disabled={unlocking}
                        onClick={(e) => { e.stopPropagation(); unlockContact(c); }}
                      >
                        <Lock className="h-3 w-3" />
                        {PROFILE_UNLOCK_COST} pts
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!openCandidate} onOpenChange={(o) => !o && setOpenCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {openCandidate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={openCandidate.profile_picture || undefined} />
                    <AvatarFallback>{openCandidate.full_name?.[0] || "C"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-lg font-semibold">{openCandidate.full_name}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {openCandidate.preferred_role || openCandidate.primary_subject || "Candidate"}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {Math.min(100, openCandidate.score)}% match
                  </Badge>
                  {openCandidate.reasons.map((r) => (
                    <Badge key={r} variant="outline" className="text-[11px]">{r}</Badge>
                  ))}
                </div>

                {(() => {
                  const isUnlocked = unlockedProfiles.has(openCandidate.id);
                  return (
                    <Card className={`p-4 space-y-2 text-sm relative ${!isUnlocked ? "bg-muted/30" : ""}`}>
                      {isUnlocked ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${openCandidate.email}`} className="hover:underline">{openCandidate.email}</a>
                          </div>
                          {openCandidate.mobile && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a href={`tel:${openCandidate.mobile}`} className="hover:underline">{openCandidate.mobile}</a>
                            </div>
                          )}
                          {openCandidate.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {openCandidate.location}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            <span className="text-sm font-medium">Contact details are hidden</span>
                          </div>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            Unlock email, phone & full profile access for this candidate.
                          </p>
                          <Button
                            size="sm"
                            disabled={unlocking}
                            onClick={() => unlockContact(openCandidate)}
                            className="gap-1.5"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            {unlocking ? "Deducting…" : `Unlock for ${PROFILE_UNLOCK_COST} pts`}
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Preferred Role
                    </div>
                    <div className="font-medium mt-1">{openCandidate.preferred_role || "—"}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> Primary Subject
                    </div>
                    <div className="font-medium mt-1">{openCandidate.primary_subject || "—"}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Experience</div>
                    <div className="font-medium mt-1">{openCandidate.experience_level || "—"}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" /> Expected Salary
                    </div>
                    <div className="font-medium mt-1">
                      {openCandidate.expected_salary ? `₹${openCandidate.expected_salary.toLocaleString()}` : "—"}
                    </div>
                  </Card>
                </div>

                {unlockedProfiles.has(openCandidate.id) ? (
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button
                      className="flex-1 min-w-[140px]"
                      onClick={() => navigate(`/employer/candidate/${openCandidate.id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Full Profile
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 min-w-[120px]"
                      onClick={() => window.open(`mailto:${openCandidate.email}`)}
                    >
                      <Mail className="h-4 w-4 mr-2" /> Email
                    </Button>
                    {openCandidate.mobile && (
                      <Button
                        variant="outline"
                        className="flex-1 min-w-[120px]"
                        onClick={() => window.open(`tel:${openCandidate.mobile}`)}
                      >
                        <Phone className="h-4 w-4 mr-2" /> Call
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuggestedCandidatesContent;
