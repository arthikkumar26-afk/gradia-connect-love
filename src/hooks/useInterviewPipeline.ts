import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InterviewStep {
  id: string;
  title: string;
  status: "completed" | "current" | "pending" | "failed" | "in_progress";
  date?: string;
  notes?: string;
  interviewer?: string;
  score?: number;
  isLive?: boolean;
  liveStatus?: "waiting" | "in_interview" | "submitting" | "completed";
  startedAt?: string;
  completedAt?: string;
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
  skills?: string[];
  aiAnalysis?: {
    summary?: string;
    strengths?: string[];
    concerns?: string[];
    interview_focus?: string[];
    autoProgressedTo?: string;
    lastInterviewScore?: number;
    candidate_data?: {
      name?: string;
      full_name?: string;
      email?: string;
      phone?: string;
      mobile?: string;
      skills?: string[];
      education?: string;
      location?: string;
      experience_level?: string;
      preferred_role?: string;
    };
  };
  autoProgressed?: boolean;
  autoProgressedFrom?: string;
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
  created_at: string | null;
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
              let isLive = false;
              let liveStatus: InterviewStep["liveStatus"] = undefined;
              
              if (event) {
                if (event.status === "completed") {
                  status = "completed";
                } else if (event.status === "failed") {
                  status = "failed";
                } else if (event.status === "in_progress") {
                  status = "in_progress";
                  isLive = true;
                  liveStatus = "in_interview";
                } else if (event.status === "scheduled" || event.status === "pending") {
                  status = "current";
                  liveStatus = "waiting";
                }
              } else if (c.current_stage_id === s.id) {
                status = "current";
                liveStatus = "waiting";
              } else if (s.stage_order < (dbStages.find(st => st.id === c.current_stage_id)?.stage_order || 0)) {
                status = "completed";
              }

              return {
                id: s.id,
                title: s.name,
                status,
                isLive,
                liveStatus,
                date: event?.scheduled_at 
                  ? new Date(event.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : undefined,
                notes: event?.notes || undefined,
                score: event?.ai_score || undefined,
                startedAt: event?.created_at || undefined,
                completedAt: event?.completed_at || undefined,
              };
            });

            // Get candidate data from AI analysis first, fallback to profile
            const candidateData = c.ai_analysis?.candidate_data;
            const candidateName = candidateData?.full_name || candidateData?.name || c.profiles?.full_name || 'Unknown';
            const candidateEmail = candidateData?.email || c.profiles?.email || '';
            const candidatePhone = candidateData?.mobile || candidateData?.phone || c.profiles?.mobile || undefined;
            const candidateLocation = candidateData?.location || c.profiles?.location || undefined;
            const candidateEducation = candidateData?.education || undefined;
            const candidateSkills = candidateData?.skills || c.jobs?.skills?.slice(0, 5) || [];

            return {
              id: c.candidate_id,
              interviewCandidateId: c.id,
              jobId: c.job_id,
              name: candidateName,
              email: candidateEmail,
              role: c.jobs?.job_title || 'Unknown Position',
              avatar: c.profiles?.profile_picture || undefined,
              appliedDate: c.applied_at 
                ? formatRelativeDate(c.applied_at)
                : 'Recently',
              rating: Math.min(5, Math.round((c.ai_score || 70) / 20)),
              tags: candidateSkills.slice(0, 3),
              phone: candidatePhone,
              location: candidateLocation,
              experience: c.profiles?.experience_level || undefined,
              education: candidateEducation,
              resumeUrl: c.resume_url || undefined,
              currentStage: stage.id,
              interviewSteps,
              aiScore: c.ai_score || undefined,
              skills: candidateSkills,
              aiAnalysis: c.ai_analysis || undefined,
              autoProgressed: !!c.ai_analysis?.autoProgressedTo,
              autoProgressedFrom: c.ai_analysis?.autoProgressedTo ? 
                dbStages.find(s => s.stage_order === (stage.stage_order - 1))?.name : undefined,
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

          // Get candidate data from AI analysis first, fallback to profile
          const candidateData = c.ai_analysis?.candidate_data;
          const candidateName = candidateData?.full_name || candidateData?.name || c.profiles?.full_name || 'Unknown';
          const candidateEmail = candidateData?.email || c.profiles?.email || '';
          const candidatePhone = candidateData?.mobile || candidateData?.phone || c.profiles?.mobile || undefined;
          const candidateLocation = candidateData?.location || c.profiles?.location || undefined;
          const candidateEducation = candidateData?.education || undefined;
          const candidateSkills = candidateData?.skills || c.jobs?.skills?.slice(0, 5) || [];

          return {
            id: c.candidate_id,
            interviewCandidateId: c.id,
            jobId: c.job_id,
            name: candidateName,
            email: candidateEmail,
            role: c.jobs?.job_title || 'Unknown Position',
            avatar: c.profiles?.profile_picture || undefined,
            appliedDate: c.applied_at ? formatRelativeDate(c.applied_at) : 'Recently',
            rating: Math.min(5, Math.round((c.ai_score || 70) / 20)),
            tags: candidateSkills.slice(0, 3),
            phone: candidatePhone,
            location: candidateLocation,
            experience: c.profiles?.experience_level || undefined,
            education: candidateEducation,
            resumeUrl: c.resume_url || undefined,
            currentStage: pipelineStages[0]?.id || '',
            interviewSteps,
            aiScore: c.ai_score || undefined,
            skills: candidateSkills,
            aiAnalysis: c.ai_analysis || undefined,
            autoProgressed: false,
            autoProgressedFrom: undefined,
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
      // Get stage info
      const { data: stageData } = await supabase
        .from('interview_stages')
        .select('*, next:interview_stages!stage_order(id, name, stage_order)')
        .eq('id', stageId)
        .single();

      // Get all stages to find next stage
      const { data: allStages } = await supabase
        .from('interview_stages')
        .select('id, name, stage_order')
        .order('stage_order');

      const currentStageOrder = stageData?.stage_order || 0;
      const nextStage = allStages?.find(s => s.stage_order === currentStageOrder + 1);

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

      // If stage is completed, move to next stage and send invitation email
      if (status === 'completed' && nextStage) {
        // Move candidate to next stage
        await supabase
          .from('interview_candidates')
          .update({ 
            current_stage_id: nextStage.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', interviewCandidateId);

        // Send invitation email for next stage
        try {
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + 2); // Schedule for 2 days from now
          
          const { error: inviteError } = await supabase.functions.invoke('send-interview-invitation', {
            body: {
              interviewCandidateId,
              stageName: nextStage.name,
              scheduledDate: scheduledDate.toISOString(),
            }
          });

          if (inviteError) {
            console.error('Failed to send invitation email:', inviteError);
          } else {
            toast.success(`Invitation email sent for ${nextStage.name}`);
          }
        } catch (emailErr) {
          console.error('Error sending stage invitation:', emailErr);
        }
      }

      // If starting a stage (in_progress), send invitation email for current stage
      if (status === 'in_progress') {
        try {
          const scheduledDate = new Date();
          scheduledDate.setHours(scheduledDate.getHours() + 1); // Schedule for 1 hour from now
          
          const { error: inviteError } = await supabase.functions.invoke('send-interview-invitation', {
            body: {
              interviewCandidateId,
              stageName: stageData?.name || 'Interview',
              scheduledDate: scheduledDate.toISOString(),
            }
          });

          if (inviteError) {
            console.error('Failed to send invitation email:', inviteError);
          } else {
            toast.success(`Interview invitation sent for ${stageData?.name}`);
          }
        } catch (emailErr) {
          console.error('Error sending stage invitation:', emailErr);
        }
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

  // Real-time subscription for live updates
  useEffect(() => {
    console.log('[Pipeline] Setting up real-time subscriptions...');
    
    const channel = supabase
      .channel('interview-pipeline-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interview_candidates' },
        (payload) => {
          console.log('[Pipeline] interview_candidates changed:', payload);
          fetchPipelineData();
          
          // Show toast for stage changes
          if (payload.eventType === 'UPDATE' && payload.old && payload.new) {
            const oldStageId = (payload.old as any).current_stage_id;
            const newStageId = (payload.new as any).current_stage_id;
            if (oldStageId !== newStageId) {
              toast.info('🔄 Pipeline updated', { 
                description: 'A candidate has progressed to a new stage',
                duration: 3000
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interview_events' },
        (payload) => {
          console.log('[Pipeline] interview_events changed:', payload);
          fetchPipelineData();
          
          // Show toast for interview completions
          if (payload.eventType === 'UPDATE') {
            const newEvent = payload.new as any;
            if (newEvent.status === 'completed') {
              toast.success('✅ Interview completed', {
                description: 'A stage has been completed',
                duration: 3000
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interview_responses' },
        (payload) => {
          console.log('[Pipeline] interview_responses changed:', payload);
          fetchPipelineData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interview_invitations' },
        (payload) => {
          console.log('[Pipeline] interview_invitations changed:', payload);
          fetchPipelineData();
        }
      )
      .subscribe((status) => {
        console.log('[Pipeline] Subscription status:', status);
      });

    return () => {
      console.log('[Pipeline] Removing real-time channel');
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
