import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Grid3X3, Star, User, Search, Filter, Download, X, Mail, Briefcase, Calendar, BarChart3, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FeedbackEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  jobTitle: string;
  stage: string;
  overallRating: number;
  technicalRating: number;
  communicationRating: number;
  cultureFitRating: number;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  reviewedAt: string;
  reviewer: string;
}

interface CandidateProfile {
  name: string;
  email: string;
  mobile?: string;
  location?: string;
  experienceLevel?: string;
  highestQualification?: string;
}

const FEEDBACK_REVIEW_COST = 150;

export const FeedbackMatrixContent = () => {
  const { user } = useAuth();
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  // Profile popup state
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [candidateReviews, setCandidateReviews] = useState<FeedbackEntry[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  // Per-candidate review unlocks (150 pts each)
  const [unlockedReviews, setUnlockedReviews] = useState<Set<string>>(new Set());
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedbackData();
  }, [user?.id]);

  // Preload prior unlocks so employer doesn't pay twice
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("wallet_transactions")
        .select("description")
        .eq("category", "feedback_review_unlock");
      if (data) {
        const ids = new Set<string>();
        data.forEach((r: any) => {
          const m = String(r.description || "").match(/\[cid:([0-9a-f-]+)\]/i);
          if (m) ids.add(m[1]);
        });
        setUnlockedReviews(ids);
      }
    })();
  }, [user?.id]);

  const ensureReviewUnlocked = async (entry: FeedbackEntry): Promise<boolean> => {
    if (!user?.id) {
      toast.error("Please sign in");
      return false;
    }
    if (unlockedReviews.has(entry.candidateId)) return true;

    setUnlockingId(entry.candidateId);
    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!wallet) {
        toast.error("Wallet not found. Please load points first.");
        return false;
      }
      const balance = wallet.points_balance ?? 0;
      if (balance < FEEDBACK_REVIEW_COST) {
        toast.error(`Insufficient points. Need ${FEEDBACK_REVIEW_COST} pts, have ${balance} pts.`);
        return false;
      }

      const { error: updErr } = await supabase
        .from("wallets")
        .update({ points_balance: balance - FEEDBACK_REVIEW_COST })
        .eq("id", wallet.id);
      if (updErr) throw updErr;

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "feedback_review_unlock",
        amount: 0,
        points: FEEDBACK_REVIEW_COST,
        description: `Feedback review unlocked for ${entry.candidateName} [cid:${entry.candidateId}]`,
      });

      setUnlockedReviews((prev) => new Set(prev).add(entry.candidateId));
      toast.success(`${FEEDBACK_REVIEW_COST} pts deducted. Review unlocked.`);
      return true;
    } catch (e: any) {
      console.error("Feedback unlock error:", e);
      toast.error(e.message || "Failed to deduct points");
      return false;
    } finally {
      setUnlockingId(null);
    }
  };

  const fetchFeedbackData = async () => {
    if (!user?.id) return;

    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', user.id);

      if (!jobs || jobs.length === 0) {
        setFeedbackEntries([]);
        setIsLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      const { data: events, error } = await supabase
        .from('interview_events')
        .select(`
          id,
          ai_feedback,
          ai_score,
          completed_at,
          notes,
          stage_id,
          interview_candidates!inner (
            id,
            job_id,
            candidate_id,
            profiles:candidate_id (full_name, email, mobile, location, experience_level, highest_qualification),
            jobs:job_id (job_title)
          ),
          interview_stages (name)
        `)
        .in('interview_candidates.job_id', jobIds)
        .not('ai_feedback', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedEntries: FeedbackEntry[] = (events || []).map((event: any) => {
        const feedback = event.ai_feedback as any || {};
        return {
          id: event.id,
          candidateId: event.interview_candidates?.candidate_id || '',
          candidateName: event.interview_candidates?.profiles?.full_name || 'Unknown',
          candidateEmail: event.interview_candidates?.profiles?.email || '',
          jobTitle: event.interview_candidates?.jobs?.job_title || 'Unknown',
          stage: event.interview_stages?.name || 'Unknown',
          overallRating: feedback.overall_score || event.ai_score || 0,
          technicalRating: feedback.technical_score || 0,
          communicationRating: feedback.communication_score || 0,
          cultureFitRating: feedback.culture_fit_score || 0,
          feedback: feedback.summary || event.notes || '',
          strengths: feedback.strengths || [],
          improvements: feedback.improvements || [],
          reviewedAt: event.completed_at || '',
          reviewer: 'AI Analysis',
        };
      });

      setFeedbackEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to load feedback data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCandidateClick = async (entry: FeedbackEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await ensureReviewUnlocked(entry);
    if (!ok) return;
    setSelectedCandidate(entry.candidateId);
    setPopupOpen(true);
    setProfileLoading(true);

    // Collect all reviews for this candidate
    const reviews = feedbackEntries.filter(f => f.candidateId === entry.candidateId);
    setCandidateReviews(reviews);

    // Fetch full profile
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, mobile, location, experience_level, highest_qualification')
        .eq('id', entry.candidateId)
        .single();

      if (profile) {
        setCandidateProfile({
          name: profile.full_name,
          email: profile.email,
          mobile: profile.mobile || undefined,
          location: profile.location || undefined,
          experienceLevel: profile.experience_level || undefined,
          highestQualification: profile.highest_qualification || undefined,
        });
      }
    } catch (err) {
      console.error('Error fetching candidate profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const filteredEntries = feedbackEntries.filter(entry => {
    const matchesSearch = entry.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "all" || entry.stage.toLowerCase().includes(stageFilter.toLowerCase());
    return matchesSearch && matchesStage;
  });

  const renderStars = (rating: number) => {
    const normalizedRating = Math.min(5, Math.max(0, rating / 20));
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= normalizedRating ? "fill-warning text-warning" : "text-muted-foreground"}`}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">({rating}%)</span>
      </div>
    );
  };

  const renderMiniStars = (rating: number) => {
    const normalizedRating = Math.min(5, Math.max(0, rating / 20));
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${star <= normalizedRating ? "fill-warning text-warning" : "text-muted-foreground"}`}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">{rating}%</span>
      </div>
    );
  };

  const getStatusBadge = (rating: number) => {
    if (rating >= 80) return <Badge className="bg-success/10 text-success">Excellent</Badge>;
    if (rating >= 60) return <Badge className="bg-primary/10 text-primary">Good</Badge>;
    if (rating >= 40) return <Badge className="bg-warning/10 text-warning">Average</Badge>;
    return <Badge className="bg-destructive/10 text-destructive">Needs Improvement</Badge>;
  };

  const avgRating = candidateReviews.length
    ? Math.round(candidateReviews.reduce((s, r) => s + r.overallRating, 0) / candidateReviews.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Grid3X3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Feedback Matrix</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View and analyze candidate feedback across all stages
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by candidate or job..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="final">Final Round</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Feedback Found</h3>
              <p className="text-muted-foreground">
                Feedback will appear here after candidates complete their interviews.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Technical</TableHead>
                  <TableHead>Communication</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(e) => handleCandidateClick(entry, e)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={(e) => handleCandidateClick(entry, e)}
                        >
                          {entry.candidateName}
                        </span>
                        {!unlockedReviews.has(entry.candidateId) && (
                          <Badge variant="outline" className="text-[10px] ml-1">
                            {unlockingId === entry.candidateId ? "..." : `${FEEDBACK_REVIEW_COST} pts`}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{entry.jobTitle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.stage}</Badge>
                    </TableCell>
                    <TableCell>{renderStars(entry.overallRating)}</TableCell>
                    <TableCell>{renderStars(entry.technicalRating)}</TableCell>
                    <TableCell>{renderStars(entry.communicationRating)}</TableCell>
                    <TableCell>{getStatusBadge(entry.overallRating)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Candidate Profile & Reviews Popup */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-base font-semibold">{candidateProfile?.name || candidateReviews[0]?.candidateName}</div>
                <div className="text-xs text-muted-foreground font-normal">Candidate Profile &amp; Reviews</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile Info */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg">
                {candidateProfile?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground truncate">{candidateProfile.email}</span>
                  </div>
                )}
                {candidateProfile?.mobile && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground">{candidateProfile.mobile}</span>
                  </div>
                )}
                {candidateProfile?.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground">{candidateProfile.location}</span>
                  </div>
                )}
                {candidateProfile?.experienceLevel && (
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground capitalize">{candidateProfile.experienceLevel}</span>
                  </div>
                )}
                {candidateProfile?.highestQualification && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground">{candidateProfile.highestQualification}</span>
                  </div>
                )}
              </div>

              {/* Overall summary */}
              <div className="flex items-center justify-between px-1">
                <div className="text-sm font-medium text-foreground">
                  {candidateReviews.length} Review{candidateReviews.length !== 1 ? 's' : ''} across all stages
                </div>
                <div className="flex items-center gap-2">
                  {renderMiniStars(avgRating)}
                  {getStatusBadge(avgRating)}
                </div>
              </div>

              <Separator />

              {/* All Reviews */}
              <div className="space-y-4">
                {candidateReviews.map((review, idx) => (
                  <div key={review.id} className="border border-border rounded-lg p-4 space-y-3">
                    {/* Stage Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{review.stage}</Badge>
                        <span className="text-xs text-muted-foreground">{review.jobTitle}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(review.overallRating)}
                        <span className="text-xs text-muted-foreground">
                          {review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>

                    {/* Scores Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Overall</p>
                        {renderMiniStars(review.overallRating)}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Technical</p>
                        {renderMiniStars(review.technicalRating)}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Communication</p>
                        {renderMiniStars(review.communicationRating)}
                      </div>
                    </div>

                    {/* Feedback Summary */}
                    {review.feedback && (
                      <div className="flex gap-2 p-3 bg-muted/40 rounded-md">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground leading-relaxed">{review.feedback}</p>
                      </div>
                    )}

                    {/* Strengths & Improvements */}
                    {(review.strengths?.length || review.improvements?.length) ? (
                      <div className="grid grid-cols-2 gap-3">
                        {review.strengths && review.strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-success mb-1.5">✓ Strengths</p>
                            <ul className="space-y-1">
                              {review.strengths.slice(0, 3).map((s, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <span className="text-success mt-0.5">•</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {review.improvements && review.improvements.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-warning mb-1.5">↑ Improvements</p>
                            <ul className="space-y-1">
                              {review.improvements.slice(0, 3).map((imp, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <span className="text-warning mt-0.5">•</span> {imp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
