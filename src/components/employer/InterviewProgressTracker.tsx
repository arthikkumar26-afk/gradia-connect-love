import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, Clock, PlayCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface InterviewEvent {
  id: string;
  status: string;
  stage_id: string;
  scheduled_at: string | null;
  completed_at: string | null;
  ai_score: number | null;
  interview_stages?: {
    name: string;
  };
}

interface Props {
  interviewCandidateId: string;
  candidateName: string;
}

export const InterviewProgressTracker = ({ interviewCandidateId, candidateName }: Props) => {
  const [events, setEvents] = useState<InterviewEvent[]>([]);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch initial events
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('interview_events')
        .select(`
          id,
          status,
          stage_id,
          scheduled_at,
          completed_at,
          ai_score,
          interview_stages:stage_id(name)
        `)
        .eq('interview_candidate_id', interviewCandidateId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setEvents(data as any);
      }
    };

    fetchEvents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`interview-progress-${interviewCandidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_events',
          filter: `interview_candidate_id=eq.${interviewCandidateId}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          setLastUpdate(new Date());

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as InterviewEvent;
            setEvents(prev => 
              prev.map(e => e.id === updated.id ? { ...e, ...updated } : e)
            );
            
            // Set live status notification
            if (updated.status === 'in_progress') {
              setLiveStatus(`${candidateName} has started their interview!`);
            } else if (updated.status === 'completed') {
              setLiveStatus(`${candidateName} has completed their interview!`);
            }
          } else if (payload.eventType === 'INSERT') {
            setEvents(prev => [...prev, payload.new as InterviewEvent]);
            setLiveStatus(`New interview stage scheduled for ${candidateName}`);
          }

          // Clear notification after 5 seconds
          setTimeout(() => setLiveStatus(null), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interviewCandidateId, candidateName]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500 animate-pulse">In Progress</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Pending'}</Badge>;
    }
  };

  const hasActiveInterview = events.some(e => e.status === 'in_progress');

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className={`h-5 w-5 ${hasActiveInterview ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} />
            Live Interview Progress
          </CardTitle>
          {hasActiveInterview && (
            <Badge variant="default" className="bg-blue-500 animate-pulse gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              LIVE
            </Badge>
          )}
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            Last update: {format(lastUpdate, 'HH:mm:ss')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Live notification banner */}
        {liveStatus && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <p className="text-sm font-medium text-primary">{liveStatus}</p>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No interview events yet
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div 
                key={event.id} 
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  event.status === 'in_progress' 
                    ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(event.status || 'pending')}
                  <div>
                    <p className="text-sm font-medium">
                      {(event.interview_stages as any)?.name || 'Interview Stage'}
                    </p>
                    {event.scheduled_at && (
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {format(new Date(event.scheduled_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                    {event.completed_at && (
                      <p className="text-xs text-green-600">
                        Completed: {format(new Date(event.completed_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {event.ai_score !== null && (
                    <Badge variant="outline" className="font-mono">
                      {event.ai_score}%
                    </Badge>
                  )}
                  {getStatusBadge(event.status || 'pending')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
