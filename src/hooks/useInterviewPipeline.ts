import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InterviewStep {
  id: string;
  title: string;
  status: "completed" | "current" | "pending" | "failed";
  date?: string;
  notes?: string;
  interviewer?: string;
  score?: number;
}

export interface PipelineCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  appliedDate: string;
  rating: number;
  tags: string[];
  phone?: string;
  location?: string;
  experience?: string;
  education?: string;
  resumeUrl?: string;
  currentStage: string;
  interviewSteps: InterviewStep[];
  aiScore?: number;
  interviewCandidateId: string;
  jobId: string;
}

export interface PipelineStage {
  id: string;
  title: string;
  stageOrder: number;
  candidates: PipelineCandidate[];
}

interface DbInterviewStage {
  id: string;
  name: string;
  stage_order: number;
  is_ai_automated: boolean;
}

interface DbInterviewCandidate {
  id: string;
  job_id: string;
  candidate_id: string;
  current_stage_id: string | null;
  ai_score: number | null;
  ai_analysis: any;
  applied_at: string;
  resume_url: string | null;
  status: string;
}

interface DbProfile {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  location: string | null;
  experience_level: string | null;
  profile_picture: string | null;
  preferred_role: string | null;
}

interface DbJob {
  id: string;
  job_title: string;
  skills: string[] | null;
}

interface DbInterviewEvent {
  id: string;
  interview_candidate_id: string;
  stage_id: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  notes: string | null;
  ai_score: number | null;
}

export const useInterviewPipeline = () => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipelineData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch interview stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('interview_stages')
        .select('*')
        .order('stage_order');

      if (stagesError) throw stagesError;

      // Fetch interview candidates with related data
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('interview_candidates')
        .select(`
          *,
          profiles:candidate_id (
            id,
            full_name,
            email,
            mobile,
            location,
            experience_level,
            profile_picture,
            preferred_role
          ),
          jobs:job_id (
            id,
            job_title,
            skills
          )
        `)
        .eq('status', 'active');

      if (candidatesError) throw candidatesError;

      // Fetch interview events
      const { data: eventsData, error: eventsError } = await supabase
        .from('interview_events')
        .select('*');

      if (eventsError) throw eventsError;

      // Map events by candidate
      const eventsByCandidate = new Map<string, DbInterviewEvent[]>();
      (eventsData || []).forEach((event: DbInterviewEvent) => {
        const existing = eventsByCandidate.get(event.interview_candidate_id) || [];
        eventsByCandidate.set(event.interview_candidate_id, [...existing, event]);
      });

      // Build pipeline stages with candidates
      const dbStages = stagesData as DbInterviewStage[];
      const dbCandidates = candidatesData as (DbInterviewCandidate & {
        profiles: DbProfile;
        jobs: DbJob;
      })[];

      const pipelineStages: PipelineStage[] = dbStages.map((stage) => {
        // Find candidates in this stage
        const stageCandidates = dbCandidates
          .filter((c) => c.current_stage_id === stage.id)
          .map((c): PipelineCandidate => {
            const events = eventsByCandidate.get(c.id) || [];
            
            // Build interview steps from stages and events
            const interviewSteps: InterviewStep[] = dbStages.map((s) => {
              const event = events.find((e) => e.stage_id === s.id);
              let status: InterviewStep["status"] = "pending";
              
              if (event) {
                if (event.status === "completed") status = "completed";
                else if (event.status === "failed") status = "failed";
                else if (event.status === "in_progress" || event.status === "scheduled") status = "current";
              } else if (c.current_stage_id === s.id) {
                status = "current";
              } else if (s.stage_order < (dbStages.find(st => st.id === c.current_stage_id)?.stage_order || 0)) {
                status = "completed";
              }

              return {
                id: s.id,
                title: s.name,
                status,
                date: event?.scheduled_at 
                  ? new Date(event.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : undefined,
                notes: event?.notes || undefined,
                score: event?.ai_score || undefined,
              };
            });

            return {
              id: c.candidate_id,
              interviewCandidateId: c.id,
              jobId: c.job_id,
              name: c.profiles?.full_name || 'Unknown',
              email: c.profiles?.email || '',
              role: c.jobs?.job_title || 'Unknown Position',
              avatar: c.profiles?.profile_picture || undefined,
              appliedDate: c.applied_at 
                ? formatRelativeDate(c.applied_at)
                : 'Recently',
              rating: Math.min(5, Math.round((c.ai_score || 70) / 20)),
              tags: c.jobs?.skills?.slice(0, 3) || [],
              phone: c.profiles?.mobile || undefined,
              location: c.profiles?.location || undefined,
              experience: c.profiles?.experience_level || undefined,
              resumeUrl: c.resume_url || undefined,
              currentStage: stage.id,
              interviewSteps,
              aiScore: c.ai_score || undefined,
            };
          });

        return {
          id: stage.id,
          title: stage.name,
          stageOrder: stage.stage_order,
          candidates: stageCandidates,
        };
      });

      // Add candidates without a stage to the first stage
      const candidatesWithoutStage = dbCandidates
        .filter((c) => !c.current_stage_id)
        .map((c): PipelineCandidate => {
          const interviewSteps: InterviewStep[] = dbStages.map((s, index) => ({
            id: s.id,
            title: s.name,
            status: index === 0 ? "current" as const : "pending" as const,
          }));

          return {
            id: c.candidate_id,
            interviewCandidateId: c.id,
            jobId: c.job_id,
            name: c.profiles?.full_name || 'Unknown',
            email: c.profiles?.email || '',
            role: c.jobs?.job_title || 'Unknown Position',
            avatar: c.profiles?.profile_picture || undefined,
            appliedDate: c.applied_at ? formatRelativeDate(c.applied_at) : 'Recently',
            rating: Math.min(5, Math.round((c.ai_score || 70) / 20)),
            tags: c.jobs?.skills?.slice(0, 3) || [],
            phone: c.profiles?.mobile || undefined,
            location: c.profiles?.location || undefined,
            experience: c.profiles?.experience_level || undefined,
            resumeUrl: c.resume_url || undefined,
            currentStage: pipelineStages[0]?.id || '',
            interviewSteps,
            aiScore: c.ai_score || undefined,
          };
        });

      if (pipelineStages.length > 0 && candidatesWithoutStage.length > 0) {
        pipelineStages[0].candidates.push(...candidatesWithoutStage);
      }

      setStages(pipelineStages);
    } catch (err: any) {
      console.error('Pipeline fetch error:', err);
      setError(err.message);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  }, []);

  const moveCandidate = async (
    interviewCandidateId: string,
    toStageId: string
  ) => {
    try {
      const { error } = await supabase
        .from('interview_candidates')
        .update({ current_stage_id: toStageId, updated_at: new Date().toISOString() })
        .eq('id', interviewCandidateId);

      if (error) throw error;
      
      // Refresh data
      await fetchPipelineData();
      toast.success('Candidate moved successfully');
    } catch (err: any) {
      console.error('Move candidate error:', err);
      toast.error('Failed to move candidate');
    }
  };

  const updateEventStatus = async (
    interviewCandidateId: string,
    stageId: string,
    status: string,
    notes?: string
  ) => {
    try {
      // Check if event exists
      const { data: existingEvent } = await supabase
        .from('interview_events')
        .select('id')
        .eq('interview_candidate_id', interviewCandidateId)
        .eq('stage_id', stageId)
        .maybeSingle();

      if (existingEvent) {
        // Update existing
        const { error } = await supabase
          .from('interview_events')
          .update({ 
            status, 
            notes,
            completed_at: status === 'completed' ? new Date().toISOString() : null 
          })
          .eq('id', existingEvent.id);

        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from('interview_events')
          .insert({
            interview_candidate_id: interviewCandidateId,
            stage_id: stageId,
            status,
            notes,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
          });

        if (error) throw error;
      }

      await fetchPipelineData();
    } catch (err: any) {
      console.error('Update event error:', err);
      toast.error('Failed to update event');
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('interview-pipeline-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interview_candidates' },
        () => fetchPipelineData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interview_events' },
        () => fetchPipelineData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPipelineData]);

  return {
    stages,
    loading,
    error,
    refetch: fetchPipelineData,
    moveCandidate,
    updateEventStatus,
  };
};

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
