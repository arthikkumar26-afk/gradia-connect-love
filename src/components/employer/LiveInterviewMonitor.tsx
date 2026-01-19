import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Eye,
  Video,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Users,
  Brain,
  Timer,
  Loader2,
  ExternalLink,
  Mail,
  Code,
  Calendar,
  Monitor,
  BarChart3,
  FileText,
  ListChecks
} from "lucide-react";
import { format } from "date-fns";

interface LiveSession {
  id: string;
  candidate_id: string;
  current_stage_order: number;
  status: string;
  started_at: string | null;
  live_view_active: boolean | null;
  profiles: {
    full_name: string;
    email: string;
    profile_picture?: string | null;
    primary_subject?: string | null;
    segment?: string | null;
  } | null;
  stage_results: Array<{
    stage_name: string;
    stage_order: number;
    ai_score: number | null;
    passed: boolean | null;
    completed_at: string | null;
  }>;
}

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  stageType?: string;
}

const INTERVIEW_STAGES: InterviewStage[] = [
  { name: 'Interview Instructions', order: 1, description: 'Process guidelines', stageType: 'email_info' },
  { name: 'Tech Slot Booking', order: 2, description: 'Book assessment slot', stageType: 'slot_booking' },
  { name: 'Technical Assessment', order: 3, description: 'Technical questions', stageType: 'assessment' },
  { name: 'Demo Slot Booking', order: 4, description: 'Book demo slot', stageType: 'slot_booking' },
  { name: 'Demo Round', order: 5, description: 'Live demonstration', stageType: 'demo' },
  { name: 'Demo Feedback', order: 6, description: 'View feedback', stageType: 'feedback' },
  { name: 'Final Review (HR)', order: 7, description: 'HR documents', stageType: 'hr_documents' },
  { name: 'All Reviews', order: 8, description: 'Final summary', stageType: 'review' },
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

const getInitials = (name: string) => {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

export const LiveInterviewMonitor = () => {
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);

  const fetchLiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_interview_sessions')
        .select(`
          id,
          candidate_id,
          current_stage_order,
          status,
          started_at,
          live_view_active,
          profiles:candidate_id(
            full_name,
            email,
            profile_picture,
            primary_subject,
            segment
          ),
          stage_results:mock_interview_stage_results(
            stage_name,
            stage_order,
            ai_score,
            passed,
            completed_at
          )
        `)
        .in('status', ['in_progress', 'started', 'pending'])
        .order('started_at', { ascending: false });

      if (error) throw error;
      setLiveSessions((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveSessions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('live-interview-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mock_interview_sessions'
        },
        (payload) => {
          console.log('Live session update:', payload);
          setRealtimeStatus('Update received');
          setTimeout(() => setRealtimeStatus(null), 3000);
          fetchLiveSessions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mock_interview_stage_results'
        },
        (payload) => {
          console.log('Stage result update:', payload);
          setRealtimeStatus('Stage completed');
          setTimeout(() => setRealtimeStatus(null), 3000);
          fetchLiveSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-red-500 text-white animate-pulse';
      case 'started':
        return 'bg-blue-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'completed':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStageProgress = (session: LiveSession) => {
    const completedStages = session.stage_results?.filter(r => r.completed_at)?.length || 0;
    return (completedStages / INTERVIEW_STAGES.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeSessions = liveSessions.filter(s => s.status === 'in_progress' || s.status === 'started');
  const pendingSessions = liveSessions.filter(s => s.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Live Interview Monitor</h2>
            <p className="text-sm text-muted-foreground">Real-time tracking of candidate interviews</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {realtimeStatus && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 animate-pulse">
              <Circle className="h-2 w-2 mr-1.5 fill-current" />
              {realtimeStatus}
            </Badge>
          )}
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live Connected
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchLiveSessions}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Video className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
                <p className="text-xs text-muted-foreground">Active Interviews</p>
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
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveSessions.filter(s => s.stage_results?.some(r => r.passed)).length}</p>
                <p className="text-xs text-muted-foreground">Passed Stages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveSessions.length}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Interviews Section */}
      {activeSessions.length > 0 && (
        <Card className="border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="relative">
                <Video className="h-5 w-5 text-red-500" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              </div>
              Active Interviews
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 animate-pulse">LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <LiveSessionCard
                    key={session.id}
                    session={session}
                    stages={INTERVIEW_STAGES}
                    isActive
                    onViewDetails={() => setSelectedSession(session)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Pending/All Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            All Interview Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveSessions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active interview sessions</p>
              <p className="text-sm text-muted-foreground">Sessions will appear here when candidates start their interviews</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {liveSessions.map((session) => (
                  <LiveSessionCard
                    key={session.id}
                    session={session}
                    stages={INTERVIEW_STAGES}
                    isActive={session.status === 'in_progress' || session.status === 'started'}
                    onViewDetails={() => setSelectedSession(session)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Selected Session Detail Modal would go here */}
    </div>
  );
};

// Live Session Card Component
const LiveSessionCard = ({
  session,
  stages,
  isActive,
  onViewDetails
}: {
  session: LiveSession;
  stages: InterviewStage[];
  isActive: boolean;
  onViewDetails: () => void;
}) => {
  const progress = (session.stage_results?.filter(r => r.completed_at)?.length || 0) / stages.length * 100;
  const currentStage = stages.find(s => s.order === session.current_stage_order);
  const Icon = stageIcons[session.current_stage_order] || Circle;

  return (
    <Card className={`transition-all ${isActive ? 'border-red-500/30 bg-red-500/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with Live Indicator */}
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={session.profiles?.profile_picture || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(session.profiles?.full_name || 'Unknown')}
              </AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-background" />
              </span>
            )}
          </div>

          {/* Session Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-semibold truncate">{session.profiles?.full_name || 'Unknown Candidate'}</h4>
              <div className="flex items-center gap-2">
                {isActive && (
                  <Badge className="bg-red-500 text-white animate-pulse text-xs">
                    <Circle className="h-1.5 w-1.5 mr-1 fill-current" />
                    LIVE
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Stage {session.current_stage_order}/8
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground truncate">{session.profiles?.email}</p>
            
            {session.profiles?.primary_subject && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {session.profiles.primary_subject}
                </Badge>
                {session.profiles?.segment && (
                  <Badge variant="outline" className="text-xs">
                    {session.profiles.segment}
                  </Badge>
                )}
              </div>
            )}

            {/* Current Stage */}
            <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
              <div className={`p-1.5 rounded-md ${isActive ? 'bg-red-500' : 'bg-primary'}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{currentStage?.name}</p>
                <p className="text-xs text-muted-foreground">{currentStage?.description}</p>
              </div>
              {isActive && (
                <Timer className="h-4 w-4 text-red-500 animate-pulse" />
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Stage Results */}
            {session.stage_results && session.stage_results.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {session.stage_results
                  .filter(r => r.completed_at)
                  .map((result, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`text-xs ${
                        result.passed 
                          ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                          : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}
                    >
                      Stage {result.stage_order}: {result.ai_score?.toFixed(0) || 0}%
                    </Badge>
                  ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                View Details
              </Button>
              {isActive && (
                <Button variant="default" size="sm" className="bg-red-500 hover:bg-red-600">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Watch Live
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveInterviewMonitor;
