import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Video,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  TrendingUp,
  Target,
  FileText,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface StageResult {
  id: string;
  session_id: string;
  stage_name: string;
  stage_order: number;
  ai_score: number | null;
  ai_feedback: string | null;
  passed: boolean | null;
  strengths: string[] | null;
  improvements: string[] | null;
  recording_url: string | null;
  completed_at: string | null;
  time_taken_seconds: number | null;
}

interface Session {
  id: string;
  status: string;
  overall_score: number | null;
  overall_feedback: string | null;
  interview_type: string | null;
  pipeline_type: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  current_stage_order: number | null;
}

interface MockInterviewHistoryProps {
  candidateId: string;
  /** If true, show a compact intro line for the employer view */
  viewerRole?: "candidate" | "employer";
}

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDuration = (secs?: number | null) => {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
};

const scoreColor = (score?: number | null) => {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
};

export const MockInterviewHistory = ({
  candidateId,
  viewerRole = "candidate",
}: MockInterviewHistoryProps) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [resultsBySession, setResultsBySession] = useState<Record<string, StageResult[]>>({});
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");

  useEffect(() => {
    if (!candidateId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data: sess, error: sessErr } = await supabase
          .from("mock_interview_sessions")
          .select(
            "id, status, overall_score, overall_feedback, interview_type, pipeline_type, started_at, completed_at, created_at, current_stage_order"
          )
          .eq("candidate_id", candidateId)
          .order("created_at", { ascending: false });

        if (sessErr) throw sessErr;
        if (cancelled) return;

        const list = (sess as Session[]) || [];
        setSessions(list);

        if (list.length > 0) {
          const ids = list.map((s) => s.id);
          const { data: results, error: resErr } = await supabase
            .from("mock_interview_stage_results")
            .select(
              "id, session_id, stage_name, stage_order, ai_score, ai_feedback, passed, strengths, improvements, recording_url, completed_at, time_taken_seconds"
            )
            .in("session_id", ids)
            .order("stage_order", { ascending: true });

          if (resErr) throw resErr;
          if (cancelled) return;

          const grouped: Record<string, StageResult[]> = {};
          (results as StageResult[] | null)?.forEach((r) => {
            grouped[r.session_id] = grouped[r.session_id] || [];
            grouped[r.session_id].push(r);
          });
          setResultsBySession(grouped);

          // auto-open the most recent session
          setOpenIds(new Set([list[0].id]));
        }
      } catch (e) {
        console.error("MockInterviewHistory load error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading mock test history…</span>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Mock Test History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-6">
            {viewerRole === "employer"
              ? "This candidate hasn't attended any mock tests yet."
              : "No mock tests attended yet. Complete a mock test above to see your reports and recordings here."}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Mock Test History
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
              </Badge>
            </CardTitle>
            {viewerRole === "employer" && (
              <p className="text-xs text-muted-foreground">
                Full reports & recorded videos from every mock test the candidate attempted.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((s) => {
            const results = resultsBySession[s.id] || [];
            const isOpen = openIds.has(s.id);
            const completed = s.status === "completed";
            return (
              <Collapsible key={s.id} open={isOpen} onOpenChange={() => toggle(s.id)}>
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          completed
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        <Award className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {s.interview_type || s.pipeline_type || "Mock Interview"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              completed
                                ? "border-green-500/40 text-green-600"
                                : "border-amber-500/40 text-amber-600"
                            }`}
                          >
                            {s.status}
                          </Badge>
                          {s.overall_score != null && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${scoreColor(s.overall_score)}`}
                            >
                              {Math.round(s.overall_score)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(s.completed_at || s.started_at || s.created_at)} ·{" "}
                          {results.length} {results.length === 1 ? "stage" : "stages"}
                        </p>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t p-3 space-y-3 bg-muted/20">
                      {s.overall_feedback && (
                        <div className="p-2 rounded bg-background border text-xs text-foreground">
                          <span className="font-medium">Overall: </span>
                          {s.overall_feedback}
                        </div>
                      )}

                      {results.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">
                          No stage results recorded for this session.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {results.map((r) => (
                            <div
                              key={r.id}
                              className="p-3 rounded-lg border bg-background space-y-2"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                {r.passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : r.passed === false ? (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium">
                                  Stage {r.stage_order}: {r.stage_name}
                                </span>
                                {r.ai_score != null && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${scoreColor(r.ai_score)}`}
                                  >
                                    {Math.round(r.ai_score)}%
                                  </Badge>
                                )}
                                {formatDuration(r.time_taken_seconds) && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(r.time_taken_seconds)}
                                  </span>
                                )}
                                {r.recording_url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="ml-auto h-6 text-xs"
                                    onClick={() => {
                                      setVideoUrl(r.recording_url);
                                      setVideoTitle(`${r.stage_name} · Recording`);
                                    }}
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Watch
                                  </Button>
                                )}
                              </div>

                              {r.ai_feedback && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {r.ai_feedback}
                                </p>
                              )}

                              {(r.strengths?.length || r.improvements?.length) ? (
                                <div className="grid sm:grid-cols-2 gap-2 pt-1">
                                  {r.strengths && r.strengths.length > 0 && (
                                    <div className="p-2 rounded bg-green-50 dark:bg-green-900/10 border border-green-200/60">
                                      <div className="flex items-center gap-1 text-[11px] font-medium text-green-700 dark:text-green-400 mb-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Strengths
                                      </div>
                                      <ul className="text-[11px] text-foreground list-disc pl-4 space-y-0.5">
                                        {r.strengths.slice(0, 4).map((x, i) => (
                                          <li key={i}>{x}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {r.improvements && r.improvements.length > 0 && (
                                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60">
                                      <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1">
                                        <Target className="h-3 w-3" />
                                        Improvements
                                      </div>
                                      <ul className="text-[11px] text-foreground list-disc pl-4 space-y-0.5">
                                        {r.improvements.slice(0, 4).map((x, i) => (
                                          <li key={i}>{x}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!videoUrl} onOpenChange={(o) => !o && setVideoUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4" />
              {videoTitle || "Recording"}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {videoUrl && (
              <video src={videoUrl} controls autoPlay className="w-full h-full" />
            )}
          </div>
          {videoUrl && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(videoUrl, "_blank")}
              >
                <FileText className="h-3 w-3 mr-1" />
                Open in new tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MockInterviewHistory;
