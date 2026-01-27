import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Code,
  Users,
  ClipboardCheck,
  Gift,
  Building2,
  Star,
  Calendar,
  MapPin,
} from "lucide-react";

interface InterviewStage {
  id: string;
  name: string;
  stage_order: number;
  is_ai_automated: boolean;
}

interface InterviewEvent {
  id: string;
  stage_id: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  ai_score: number | null;
  ai_feedback: any;
  notes: string | null;
}

interface InterviewCandidate {
  id: string;
  job_id: string;
  ai_score: number | null;
  ai_analysis: any;
  status: string;
  current_stage_id: string | null;
  applied_at: string;
  job: {
    job_title: string;
    location: string | null;
    employer: {
      company_name: string | null;
      profile_picture: string | null;
    } | null;
  } | null;
  events: InterviewEvent[];
}

interface InterviewPipelineTabProps {
  candidateId: string;
}

export const InterviewPipelineTab = ({ candidateId }: InterviewPipelineTabProps) => {
  const [interviews, setInterviews] = useState<InterviewCandidate[]>([]);
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [candidateId]);

  const fetchData = async () => {
    try {
      // Fetch interview stages
      const { data: stagesData } = await supabase
        .from('interview_stages')
        .select('*')
        .order('stage_order', { ascending: true });

      setStages(stagesData || []);

      // Fetch interview candidates for this user
      const { data: interviewsData, error } = await supabase
        .from('interview_candidates')
        .select(`
          id,
          job_id,
          ai_score,
          ai_analysis,
          status,
          current_stage_id,
          applied_at,
          job:jobs (
            job_title,
            location,
            employer:profiles!jobs_employer_id_fkey (
              company_name,
              profile_picture
            )
          )
        `)
        .eq('candidate_id', candidateId)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Fetch events for each interview
      const interviewsWithEvents = await Promise.all(
        (interviewsData || []).map(async (interview) => {
          const { data: eventsData } = await supabase
            .from('interview_events')
            .select('*')
            .eq('interview_candidate_id', interview.id)
            .order('created_at', { ascending: true });

          return {
            ...interview,
            events: eventsData || []
          };
        })
      );

      setInterviews(interviewsWithEvents);
      if (interviewsWithEvents.length > 0) {
        setSelectedInterview(interviewsWithEvents[0].id);
      }
    } catch (error) {
      console.error('Error fetching interview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStageIcon = (stageName: string) => {
    switch (stageName) {
      case 'Resume Screening':
        return FileText;
      case 'Technical Assessment':
        return Code;
      case 'HR Round':
        return Users;
      case 'Viva':
        return ClipboardCheck;
      case 'Final Review':
        return ClipboardCheck;
      case 'Offer Stage':
        return Gift;
      default:
        return CheckCircle2;
    }
  };

  const getStageStatus = (stageId: string, events: InterviewEvent[], currentStageId: string | null) => {
    const event = events.find(e => e.stage_id === stageId);
    if (event) {
      return event.status;
    }
    
    const stage = stages.find(s => s.id === stageId);
    const currentStage = stages.find(s => s.id === currentStageId);
    
    if (stage && currentStage && stage.stage_order < currentStage.stage_order) {
      return 'completed';
    }
    if (stage && currentStage && stage.stage_order === currentStage.stage_order) {
      return 'current';
    }
    return 'upcoming';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'current':
      case 'pending':
      case 'scheduled':
        return 'text-primary bg-primary/10 border-primary/30';
      case 'in_progress':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getCurrentStageOrder = (currentStageId: string | null) => {
    if (!currentStageId) return 1;
    const stage = stages.find(s => s.id === currentStageId);
    return stage?.stage_order || 1;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Active Interviews</h3>
        <p className="text-muted-foreground">
          Your interview progress will appear here once you apply for jobs
        </p>
      </Card>
    );
  }

  const currentInterview = interviews.find(i => i.id === selectedInterview) || interviews[0];

  return (
    <div className="space-y-6">
      {/* Interview Selector */}
      {interviews.length > 1 && (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {interviews.map((interview) => (
              <button
                key={interview.id}
                onClick={() => setSelectedInterview(interview.id)}
                className={`flex-shrink-0 p-3 rounded-lg border transition-all ${
                  selectedInterview === interview.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm text-foreground">
                      {interview.job?.job_title || 'Unknown Position'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {interview.job?.employer?.company_name}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Selected Interview Details */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
              {currentInterview.job?.employer?.profile_picture ? (
                <img 
                  src={currentInterview.job.employer.profile_picture} 
                  alt="" 
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <Building2 className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {currentInterview.job?.job_title || 'Unknown Position'}
              </h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{currentInterview.job?.employer?.company_name}</span>
                {currentInterview.job?.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {currentInterview.job.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            {currentInterview.ai_score && (
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg px-4 py-2">
                <p className="text-xs text-muted-foreground">AI Match Score</p>
                <p className="text-2xl font-bold text-primary">{currentInterview.ai_score}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Interview Progress</span>
            <span className="text-sm text-muted-foreground">
              Stage {getCurrentStageOrder(currentInterview.current_stage_id)} of {stages.length}
            </span>
          </div>
          <Progress 
            value={(getCurrentStageOrder(currentInterview.current_stage_id) / stages.length) * 100} 
            className="h-2"
          />
        </div>

        {/* Pipeline Stages */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map((stage) => {
            const status = getStageStatus(stage.id, currentInterview.events, currentInterview.current_stage_id);
            const event = currentInterview.events.find(e => e.stage_id === stage.id);
            const Icon = getStageIcon(stage.name);
            
            return (
              <div
                key={stage.id}
                className={`relative p-4 rounded-lg border-2 transition-all ${getStatusColor(status)}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' || status === 'pending' || status === 'scheduled' ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <p className="text-xs font-medium line-clamp-2">{stage.name}</p>
                  
                  {/* Status indicator */}
                  <div className="mt-2">
                    {status === 'completed' && event?.ai_score && (
                      <Badge variant="secondary" className="text-xs">
                        {event.ai_score}%
                      </Badge>
                    )}
                    {status === 'current' && (
                      <Badge className="bg-primary text-primary-foreground text-xs">Current</Badge>
                    )}
                    {status === 'scheduled' && event?.scheduled_at && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(event.scheduled_at)}
                      </Badge>
                    )}
                    {status === 'upcoming' && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Upcoming</Badge>
                    )}
                  </div>
                </div>

                {/* Stage connector line */}
                {stage.stage_order < stages.length && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-border" />
                )}
              </div>
            );
          })}
        </div>

        {/* AI Analysis Summary */}
        {currentInterview.ai_analysis && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              AI Analysis Summary
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              {currentInterview.ai_analysis.summary}
            </p>
            {currentInterview.ai_analysis.strengths && (
              <div className="flex flex-wrap gap-2">
                {currentInterview.ai_analysis.strengths.slice(0, 3).map((strength: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    {strength}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
