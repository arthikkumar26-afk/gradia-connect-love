import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  Circle,
  Lock,
  Mail,
  Code,
  Calendar,
  Monitor,
  BarChart3,
  FileText,
  ListChecks,
  Clock,
  Users,
  Video,
  Activity,
  Play,
  XCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Eye,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  stageType: string;
  questionCount: number;
  passingScore: number;
}

interface CandidateSession {
  id: string;
  candidate_id: string;
  current_stage_order: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  overall_score: number | null;
  profiles: {
    full_name: string;
    email: string;
    profile_picture: string | null;
    mobile: string | null;
    primary_subject: string | null;
    segment: string | null;
  } | null;
  stage_results: Array<{
    id: string;
    stage_name: string;
    stage_order: number;
    ai_score: number | null;
    passed: boolean | null;
    completed_at: string | null;
    ai_feedback: string | null;
    recording_url: string | null;
  }>;
}

const INTERVIEW_STAGES: InterviewStage[] = [
  { name: 'Interview Instructions', order: 1, description: 'Process guidelines and email', stageType: 'email_info', questionCount: 0, passingScore: 0 },
  { name: 'Technical Assessment Slot Booking', order: 2, description: 'Book assessment time slot', stageType: 'slot_booking', questionCount: 0, passingScore: 0 },
  { name: 'Technical Assessment', order: 3, description: 'Domain knowledge evaluation', stageType: 'assessment', questionCount: 8, passingScore: 70 },
  { name: 'Demo Slot Booking', order: 4, description: 'Book demo interview slot', stageType: 'slot_booking', questionCount: 0, passingScore: 0 },
  { name: 'Demo Round', order: 5, description: 'Live teaching demonstration', stageType: 'demo', questionCount: 1, passingScore: 65 },
  { name: 'Demo Feedback', order: 6, description: 'AI evaluation metrics', stageType: 'feedback', questionCount: 0, passingScore: 0 },
  { name: 'Final Review (HR)', order: 7, description: 'Document verification', stageType: 'hr_documents', questionCount: 4, passingScore: 75 },
  { name: 'All Reviews', order: 8, description: 'Comprehensive summary', stageType: 'review', questionCount: 0, passingScore: 0 },
];

const stageIcons: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Mail,
  2: Calendar,
  3: Code,
  4: Calendar,
  5: Monitor,
  6: BarChart3,
  7: FileText,
  8: ListChecks,
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

export const EmployerInterviewPipelineTracker = () => {
  const [sessions, setSessions] = useState<CandidateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CandidateSession | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [realtimeUpdate, setRealtimeUpdate] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_interview_sessions')
        .select(`
          id,
          candidate_id,
          current_stage_order,
          status,
          started_at,
          completed_at,
          overall_score,
          profiles:candidate_id(
            full_name,
            email,
            profile_picture,
            mobile,
            primary_subject,
            segment
          ),
          stage_results:mock_interview_stage_results(
            id,
            stage_name,
            stage_order,
            ai_score,
            passed,
            completed_at,
            ai_feedback,
            recording_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load interview sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    // Real-time subscription
    const channel = supabase
      .channel('employer-pipeline-tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_interview_sessions' }, (payload) => {
        setRealtimeUpdate(`Session updated: ${payload.eventType}`);
        setTimeout(() => setRealtimeUpdate(null), 3000);
        fetchSessions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_interview_stage_results' }, (payload) => {
        setRealtimeUpdate(`Stage completed`);
        setTimeout(() => setRealtimeUpdate(null), 3000);
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getFilteredSessions = () => {
    switch (activeTab) {
      case 'active':
        return sessions.filter(s => s.status === 'in_progress' || s.status === 'started');
      case 'completed':
        return sessions.filter(s => s.status === 'completed');
      case 'pending':
        return sessions.filter(s => s.status === 'pending');
      default:
        return sessions;
    }
  };

  const getStageStatus = (session: CandidateSession, stageOrder: number) => {
    const result = session.stage_results?.find(r => r.stage_order === stageOrder);
    if (result?.completed_at) return 'completed';
    if (stageOrder === session.current_stage_order) return 'current';
    if (stageOrder < session.current_stage_order) return 'completed';
    return 'locked';
  };

  const sendInvitation = async (session: CandidateSession, stageOrder: number) => {
    const stage = INTERVIEW_STAGES.find(s => s.order === stageOrder);
    if (!stage || !session.profiles) return;

    try {
      const { error } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: session.profiles.email,
          candidateName: session.profiles.full_name,
          sessionId: session.id,
          stageOrder,
          stageName: stage.name,
          stageDescription: stage.description,
          appUrl: window.location.origin
        }
      });

      if (error) throw error;
      toast.success(`Invitation sent for ${stage.name}`);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeSessions = sessions.filter(s => s.status === 'in_progress' || s.status === 'started');
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const pendingSessions = sessions.filter(s => s.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Mock Interview Pipeline
              {realtimeUpdate && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 animate-pulse text-xs">
                  {realtimeUpdate}
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              Complete 8-stage interview workflow with AI evaluation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live Connected
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Video className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedSessions.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSessions.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Pipeline Stages (8-Stage Workflow)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {INTERVIEW_STAGES.map((stage) => {
              const Icon = stageIcons[stage.order];
              const countAtStage = sessions.filter(s => s.current_stage_order === stage.order && s.status !== 'completed').length;
              
              return (
                <div key={stage.order} className="text-center">
                  <div className="p-3 rounded-lg bg-muted/50 mb-2">
                    <div className="h-10 w-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium line-clamp-2">{stage.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{countAtStage} candidates</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Candidate Sessions</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">All ({sessions.length})</TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3">Active ({activeSessions.length})</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs px-3">Completed ({completedSessions.length})</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs px-3">Pending ({pendingSessions.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {getFilteredSessions().length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sessions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredSessions().map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    stages={INTERVIEW_STAGES}
                    stageIcons={stageIcons}
                    onSendInvitation={sendInvitation}
                    onViewDetails={() => setSelectedSession(session)}
                    getStageStatus={getStageStatus}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Session Detail View */}
      {selectedSession && (
        <SessionDetailView
          session={selectedSession}
          stages={INTERVIEW_STAGES}
          stageIcons={stageIcons}
          onClose={() => setSelectedSession(null)}
          getStageStatus={getStageStatus}
        />
      )}
    </div>
  );
};

// Session Card Component
const SessionCard = ({
  session,
  stages,
  stageIcons,
  onSendInvitation,
  onViewDetails,
  getStageStatus
}: {
  session: CandidateSession;
  stages: InterviewStage[];
  stageIcons: Record<number, React.ComponentType<{ className?: string }>>;
  onSendInvitation: (session: CandidateSession, stageOrder: number) => void;
  onViewDetails: () => void;
  getStageStatus: (session: CandidateSession, stageOrder: number) => string;
}) => {
  const isActive = session.status === 'in_progress' || session.status === 'started';
  const progress = (session.stage_results?.filter(r => r.completed_at)?.length || 0) / stages.length * 100;
  const currentStage = stages.find(s => s.order === session.current_stage_order);
  const Icon = currentStage ? stageIcons[currentStage.order] : Circle;

  return (
    <Card className={cn("transition-all", isActive && "border-red-500/30 bg-red-500/5")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={session.profiles?.profile_picture || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(session.profiles?.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-background" />
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-semibold truncate">{session.profiles?.full_name || 'Unknown'}</h4>
              <div className="flex items-center gap-2">
                {isActive && (
                  <Badge className="bg-red-500 text-white animate-pulse text-xs">LIVE</Badge>
                )}
                {session.status === 'completed' && (
                  <Badge className="bg-green-500 text-white text-xs">Completed</Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Stage {session.current_stage_order}/{stages.length}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{session.profiles?.email}</p>

            {/* Stage Progress Mini */}
            <div className="flex gap-1 mt-3">
              {stages.map((stage) => {
                const status = getStageStatus(session, stage.order);
                const StageIcon = stageIcons[stage.order];
                return (
                  <div
                    key={stage.order}
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs transition-all",
                      status === 'completed' && "bg-green-500 text-white",
                      status === 'current' && (isActive ? "bg-red-500 text-white animate-pulse" : "bg-primary text-white"),
                      status === 'locked' && "bg-muted text-muted-foreground"
                    )}
                    title={stage.name}
                  >
                    <StageIcon className="h-3.5 w-3.5" />
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                View Details
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onSendInvitation(session, session.current_stage_order)}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Send Reminder
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Session Detail View
const SessionDetailView = ({
  session,
  stages,
  stageIcons,
  onClose,
  getStageStatus
}: {
  session: CandidateSession;
  stages: InterviewStage[];
  stageIcons: Record<number, React.ComponentType<{ className?: string }>>;
  onClose: () => void;
  getStageStatus: (session: CandidateSession, stageOrder: number) => string;
}) => {
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.profiles?.profile_picture || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(session.profiles?.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{session.profiles?.full_name}</CardTitle>
              <p className="text-sm text-muted-foreground">{session.profiles?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Full Pipeline View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {stages.map((stage) => {
              const status = getStageStatus(session, stage.order);
              const result = session.stage_results?.find(r => r.stage_order === stage.order);
              const Icon = stageIcons[stage.order];

              return (
                <Card key={stage.order} className={cn(
                  "transition-all",
                  status === 'completed' && "border-green-500/30",
                  status === 'current' && "border-primary/50"
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        status === 'completed' && "bg-green-500 text-white",
                        status === 'current' && "bg-primary text-white",
                        status === 'locked' && "bg-muted text-muted-foreground"
                      )}>
                        {status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : status === 'locked' ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{stage.name}</p>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                        {result?.ai_score !== undefined && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "mt-1 text-xs",
                              result.passed 
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                            )}
                          >
                            Score: {result.ai_score.toFixed(0)}%
                          </Badge>
                        )}
                        {result?.completed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(result.completed_at), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Overall Score if completed */}
          {session.overall_score !== null && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Overall Interview Score</p>
                    <p className="text-3xl font-bold text-primary">{session.overall_score.toFixed(0)}%</p>
                  </div>
                  <Badge className={session.overall_score >= 70 ? "bg-green-500" : "bg-red-500"}>
                    {session.overall_score >= 70 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployerInterviewPipelineTracker;
