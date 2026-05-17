import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, UserCheck, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Props {
  hrId: string;
  employerId: string;
  employerName: string;
  jobId: string;
  jobTitle: string;
  jobCategory?: string | null;
  jobSegment?: string | null;
  jobSkills?: string[] | null;
}

interface CandidateMatch {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  preferred_role: string | null;
  experience_level: string | null;
  location: string | null;
  category: string | null;
  segment: string | null;
  score: number;
}

export default function MatchableProfilesSection({
  hrId, employerId, employerName, jobId, jobTitle, jobCategory, jobSegment, jobSkills,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateMatch[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [excludeIds, setExcludeIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setSelected(new Set());
      try {
        // Already-applied for this job
        const { data: applied } = await supabase
          .from("interview_candidates")
          .select("candidate_id")
          .eq("job_id", jobId);
        const appliedSet = new Set((applied || []).map((r: any) => r.candidate_id));

        // Already-recommended for this employer/job
        const { data: rec } = await supabase
          .from("hr_recommended_candidates")
          .select("candidate_id")
          .eq("employer_id", employerId)
          .eq("job_id", jobId);
        const recSet = new Set((rec || []).map((r: any) => r.candidate_id));
        setSentIds(recSet);
        setExcludeIds(new Set([...appliedSet]));

        // Pull a wide candidate pool (recent 500). Score client-side.
        const { data: pool } = await supabase
          .from("profiles")
          .select("id, full_name, email, mobile, preferred_role, experience_level, location, category, segment")
          .eq("role", "candidate")
          .order("created_at", { ascending: false })
          .limit(500);

        const title = (jobTitle || "").toLowerCase();
        const titleTokens = title.split(/[\s,/&-]+/).filter(t => t.length > 2);
        const skills = (jobSkills || []).map(s => s.toLowerCase());

        const scored: CandidateMatch[] = ((pool as any[]) || []).map(c => {
          let s = 0;
          const role = (c.preferred_role || "").toLowerCase();
          if (role && (role.includes(title) || title.includes(role))) s += 50;
          titleTokens.forEach(t => { if (role.includes(t)) s += 10; });
          if (jobCategory && c.category && jobCategory === c.category) s += 20;
          if (jobSegment && c.segment && jobSegment === c.segment) s += 15;
          skills.forEach(sk => { if (role.includes(sk)) s += 5; });
          return { ...c, score: s } as CandidateMatch;
        }).filter(c => c.score > 0 && !appliedSet.has(c.id))
          .sort((a, b) => b.score - a.score)
          .slice(0, 50);

        if (!cancel) setCandidates(scored);
      } catch (e) {
        console.error(e);
        if (!cancel) toast.error("Couldn't load matchable profiles.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [jobId, employerId, jobTitle, jobCategory, jobSegment, jobSkills]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(c =>
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.preferred_role || "").toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q)
    );
  }, [candidates, filter]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filtered.filter(c => !sentIds.has(c.id)).map(c => c.id)));
  };

  const send = async () => {
    if (selected.size === 0) {
      toast.info("Select at least one profile to send.");
      return;
    }
    setSending(true);
    try {
      const rows = Array.from(selected).map(cid => ({
        hr_id: hrId,
        employer_id: employerId,
        job_id: jobId,
        candidate_id: cid,
      }));
      const { error } = await supabase
        .from("hr_recommended_candidates")
        .upsert(rows, { onConflict: "employer_id,job_id,candidate_id", ignoreDuplicates: true });
      if (error) throw error;
      setSentIds(prev => new Set([...prev, ...selected]));
      toast.success(`Sent ${selected.size} profile${selected.size > 1 ? "s" : ""} to ${employerName}.`);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message || "Failed to send profiles.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Matchable Profiles
            {!loading && <Badge variant="secondary" className="text-[10px]">{candidates.length} found</Badge>}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            AI-suggested candidates based on role, category and segment. Tick and forward to {employerName}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Filter by name, role, location…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 text-xs max-w-[220px]"
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={selectAllVisible} disabled={loading || filtered.length === 0}>
            Select all
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={send} disabled={sending || selected.size === 0}>
            {sending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            Send {selected.size > 0 ? `(${selected.size})` : ""} to Employer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No matching candidates found for this vacancy yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filtered.map(c => {
              const isSent = sentIds.has(c.id);
              const isSelected = selected.has(c.id);
              return (
                <div key={c.id} className={`border rounded-md p-2.5 flex items-start gap-2 ${isSelected ? "border-primary bg-primary/5" : ""}`}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(c.id)}
                    disabled={isSent}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{c.full_name || "Candidate"}</p>
                      <Badge variant="secondary" className="text-[10px]">Match {c.score}</Badge>
                      {c.experience_level && <Badge variant="outline" className="text-[10px]">{c.experience_level}</Badge>}
                      {isSent && <Badge className="text-[10px] bg-emerald-600 text-white"><UserCheck className="h-3 w-3 mr-0.5" /> Sent</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {c.preferred_role || "—"}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                      {c.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.mobile}</span>}
                      {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
