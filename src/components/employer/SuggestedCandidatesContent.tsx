import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Briefcase, MapPin, Mail, Phone, Users } from "lucide-react";

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
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    const scored = candidates
      .map((c) => scoreCandidate(c, selectedJob))
      .sort((a, b) => b.score - a.score);
    const withScore = scored.filter((c) => c.score > 0);
    // Fallback: if no scored matches, still surface top candidates so the panel isn't empty
    return (withScore.length > 0 ? withScore : scored).slice(0, 50);
  }, [candidates, selectedJob]);

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
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading suggestions…</div>
        ) : !selectedJob ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Post or activate a vacancy to see suggested candidates.
          </div>
        ) : matched.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Users className="h-8 w-8 opacity-40" />
            No matching candidates found for this vacancy yet.
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
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={c.profile_picture || undefined} />
                        <AvatarFallback>{c.full_name?.[0] || "C"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{c.full_name}</span>
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
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => window.open(`mailto:${c.email}`)}
                        title={c.email}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      {c.mobile && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => window.open(`tel:${c.mobile}`)}
                          title={c.mobile}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default SuggestedCandidatesContent;
