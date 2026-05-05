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
  pipeline_stages: any | null;
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

      // Get current user to filter by employer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch employer's job IDs first
      const { data: employerJobs, error: jobsFilterError } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', user.id);

      if (jobsFilterError) throw jobsFilterError;

      const employerJobIds = (employerJobs || []).map(j => j.id);

      // Fetch interview stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('interview_stages')
        .select('*')
        .order('stage_order');

      if (stagesError) throw stagesError;

      // If employer has no jobs, return empty pipeline
      if (employerJobIds.length === 0) {
        const dbStagesAll = stagesData as DbInterviewStage[];
        const offerStageOrderEmpty = dbStagesAll.find(s => s.name === 'Offer Stage')?.stage_order;
        const filteredEmptyStages = dbStagesAll.filter(s => offerStageOrderEmpty != null ? s.stage_order <= offerStageOrderEmpty : true);
        setStages(filteredEmptyStages.map(stage => ({
          id: stage.id,
          title: stage.name,
          stageOrder: stage.stage_order,
          candidates: [],
        })));
        setLoading(false);
        return;
      }

      // Fetch interview candidates filtered by employer's jobs
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
            skills,
            pipeline_stages
          )
        `)
        .eq('status', 'active')
        .in('job_id', employerJobIds);

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
      const dbStagesAll2 = stagesData as DbInterviewStage[];
      const dbCandidates = candidatesData as (DbInterviewCandidate & {
        profiles: DbProfile;
        jobs: DbJob;
      })[];

      // Filter out stages after Offer Stage for the pipeline columns
      // BUT also include any stages referenced by custom job pipelines (e.g., Segment, Admin & Academic for Principal)
      const offerStageOrderMain = dbStagesAll2.find(s => s.name === 'Offer Stage')?.stage_order;
      const defaultDbStages = dbStagesAll2.filter(s => offerStageOrderMain != null ? s.stage_order <= offerStageOrderMain : true);
      
      // Collect all stage names used by any candidate's custom job pipeline
      const customPipelineStageNames = new Set<string>();
      (candidatesData as (DbInterviewCandidate & { profiles: DbProfile; jobs: DbJob })[]).forEach(c => {
        const jobPipeline = c.jobs?.pipeline_stages as Array<{ name: string }> | null;
        if (jobPipeline && jobPipeline.length > 0) {
          jobPipeline.forEach(ps => customPipelineStageNames.add(ps.name));
        }
      });
      
      // Merge: include default stages + any custom pipeline stages not already included
      // Build a combined ordering map from custom pipelines for column sorting
      const combinedPipelineOrder = new Map<string, number>();
      (candidatesData as (DbInterviewCandidate & { profiles: DbProfile; jobs: DbJob })[]).forEach(c => {
        const jobPipeline = c.jobs?.pipeline_stages as Array<{ name: string; order: number }> | null;
        if (jobPipeline && jobPipeline.length > 0) {
          jobPipeline.forEach(ps => {
            if (!combinedPipelineOrder.has(ps.name)) {
              combinedPipelineOrder.set(ps.name, ps.order);
            }
          });
        }
      });

      // If custom pipelines exist, show ONLY stages from custom pipelines (union of all jobs' pipelines)
      // plus stages that have candidates in them. Otherwise use default (up to Offer Stage).
      let dbStages: DbInterviewStage[];
      if (customPipelineStageNames.size > 0) {
        const candidateStageIds = new Set(
          (candidatesData as DbInterviewCandidate[]).map(c => c.current_stage_id).filter(Boolean)
        );
        dbStages = dbStagesAll2
          .filter(s => customPipelineStageNames.has(s.name) || candidateStageIds.has(s.id))
          .sort((a, b) => {
            const aOrder = combinedPipelineOrder.get(a.name) ?? a.stage_order;
            const bOrder = combinedPipelineOrder.get(b.name) ?? b.stage_order;
            return aOrder - bOrder;
          });
        // Deduplicate by id
        const seen = new Set<string>();
        dbStages = dbStages.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
      } else {
        dbStages = defaultDbStages;
      }

      const pipelineStages: PipelineStage[] = dbStages.map((stage) => {
        // Find candidates in this stage
        const stageCandidates = dbCandidates
          .filter((c) => c.current_stage_id === stage.id)
          .map((c): PipelineCandidate => {
            const events = eventsByCandidate.get(c.id) || [];
            
            // Build interview steps from stages and events
            // Get the current stage order/name
            const currentStage = dbStages.find(st => st.id === c.current_stage_id);
            const currentStageOrder = currentStage?.stage_order ?? 0;
            const currentStageName = currentStage?.name ?? null;
            
            // Use job-specific custom pipeline stages for display names if available
            const jobCustomStages = c.jobs?.pipeline_stages as Array<{ order: number; name: string; description: string; isAutomated: boolean }> | null;

            // Ensure Interview Guidelines (or equivalent like Instruction Mail) is always included as the first stage
            const baseCustomStages = jobCustomStages && jobCustomStages.length > 0
              ? (jobCustomStages.some(cs => cs.name === 'Interview Guidelines' || cs.name === 'Instruction Mail')
                ? jobCustomStages
                : [{ order: 0, name: 'Interview Guidelines', description: 'Automated interview guidelines sent to candidate', isAutomated: true }, ...jobCustomStages])
              : null;

            // Inject the actual live round between every "Slot Booking" and its matching "Feedback"
            // (e.g. "Segment Round Slot Booking" → "Segment Round" → "Segment Feedback")
            const injectRoundStages = (stages: typeof jobCustomStages) => {
              if (!stages) return stages;
              const out: typeof stages = [];
              for (let i = 0; i < stages.length; i++) {
                const cur = stages[i];
                out.push(cur);
                const slotMatch = cur.name.match(/^(.*?)\s+Slot Booking$/i);
                if (slotMatch) {
                  const baseName = slotMatch[1].trim();
                  const roundName = /round$/i.test(baseName) ? baseName : `${baseName} Round`;
                  const next = stages[i + 1];
                  const isRoundAlreadyThere = next && (next.name === roundName || next.name === baseName);
                  const isFeedbackNext = next && /(Feedback|Round Feedback)$/i.test(next.name);
                  if (!isRoundAlreadyThere && isFeedbackNext) {
                    out.push({
                      order: cur.order + 0.5,
                      name: roundName,
                      description: `Live ${roundName} — add meeting link & observer emails`,
                      isAutomated: false,
                    } as any);
                  }
                }
              }
              return out;
            };

            const effectiveCustomStages = injectRoundStages(baseCustomStages);

            // Principal/advanced pipelines store local step order in jobs.pipeline_stages,
            // which does NOT match the global interview_stages.stage_order values.
            // So we must derive position by stage NAME, not by stage_order.
            const customStagePositionMap = effectiveCustomStages && effectiveCustomStages.length > 0
              ? new Map(effectiveCustomStages.map((stage, index) => [stage.name, index]))
              : null;

            const hiddenStageToVisibleStageMap: Record<string, string> = {
              'Demo Round': 'Demo Feedback',
              'Segment Round': 'Segment Feedback',
              'Admin & Academic Round': 'Admin & Academic Feedback',
              'Core Team Round': 'Core Team Feedback',
              'Management Round': 'Management Round Feedback',
              'HR Round': 'HR Feedback',
            };

            const resolvedCurrentVisibleStageName = currentStageName
              ? (customStagePositionMap?.has(currentStageName)
                  ? currentStageName
                  : hiddenStageToVisibleStageMap[currentStageName] || currentStageName)
              : null;

            const currentPipelinePosition = customStagePositionMap && resolvedCurrentVisibleStageName
              ? (customStagePositionMap.get(resolvedCurrentVisibleStageName) ?? 0)
              : currentStageOrder;
            
            // Filter stages: if job has custom pipeline, use full DB stages to find matching ones;
            // otherwise, dbStages is already filtered to Offer Stage.
            // Sort by the custom pipeline order, not the DB stage_order.
            let relevantStages = dbStages;
            let useVirtualStages = false;
            if (effectiveCustomStages && effectiveCustomStages.length > 0) {
              const customFiltered = dbStagesAll2.filter(s => effectiveCustomStages.some(cs => cs.name === s.name));
              // If less than half the custom stages matched DB stages, use virtual stage fallback
              if (customFiltered.length >= effectiveCustomStages.length * 0.5 && customFiltered.length > 0) {
                // Sort by the job's custom pipeline order
                relevantStages = customFiltered.sort((a, b) => {
                  const aOrder = effectiveCustomStages.findIndex(cs => cs.name === a.name);
                  const bOrder = effectiveCustomStages.findIndex(cs => cs.name === b.name);
                  return aOrder - bOrder;
                });
              } else {
                useVirtualStages = true;
              }
            }

            let interviewSteps: InterviewStep[];

            if (useVirtualStages && effectiveCustomStages && effectiveCustomStages.length > 0) {
              // Virtual stage fallback: create steps directly from job's pipeline_stages config
              interviewSteps = effectiveCustomStages.map((cs, idx) => {
                // Try to find a matching DB stage for event lookups
                const matchingDbStage = dbStagesAll2.find(s => s.name === cs.name);
                const stageEvents = matchingDbStage 
                  ? events.filter((e) => e.stage_id === matchingDbStage.id)
                  : [];
                const event = stageEvents.find((e) => e.status === 'completed' || e.status === 'passed')
                  || stageEvents.find((e) => e.status === 'in_progress')
                  || stageEvents.find((e) => e.status === 'failed')
                  || stageEvents[0] || null;

                let status: InterviewStep["status"] = "pending";
                let isLive = false;
                let liveStatus: InterviewStep["liveStatus"] = undefined;

                if (idx < currentPipelinePosition) {
                  status = "completed";
                } else if (idx === currentPipelinePosition) {
                  status = "current";
                  liveStatus = "waiting";
                } else {
                  status = "pending";
                }

                // Override with event status if exists
                if (event) {
                  if (event.status === "completed" || event.status === "passed") {
                    status = "completed";
                  } else if (event.status === "failed") {
                    status = "failed";
                  } else if (event.status === "in_progress") {
                    status = "in_progress";
                    isLive = true;
                    liveStatus = "in_interview";
                  }
                }

                return {
                  id: matchingDbStage?.id || `virtual-${idx}`,
                  title: cs.name,
                  status,
                  isLive,
                  liveStatus,
                  date: event?.scheduled_at 
                    ? new Date(event.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : event?.completed_at 
                      ? new Date(event.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : undefined,
                  notes: event?.notes || undefined,
                  score: event?.ai_score || undefined,
                  startedAt: event?.created_at || undefined,
                  completedAt: event?.completed_at || undefined,
                };
              });
            } else {
              interviewSteps = relevantStages.map((s) => {
              // Find the most relevant event for this stage (completed > in_progress > pending)
              const stageEvents = events.filter((e) => e.stage_id === s.id);
              const event = stageEvents.find((e) => e.status === 'completed' || e.status === 'passed')
                || stageEvents.find((e) => e.status === 'in_progress')
                || stageEvents.find((e) => e.status === 'failed')
                || stageEvents[0] || null;

              const customStage = effectiveCustomStages?.find(cs => cs.name === s.name) || effectiveCustomStages?.find(cs => cs.order === s.stage_order);
              const displayTitle = customStage?.name || s.name;

              let status: InterviewStep["status"] = "pending";
              let isLive = false;
              let liveStatus: InterviewStep["liveStatus"] = undefined;

              const resolvedVisibleStageName = customStagePositionMap?.has(displayTitle)
                ? displayTitle
                : hiddenStageToVisibleStageMap[s.name] || displayTitle;

              const stagePipelinePosition = customStagePositionMap && resolvedVisibleStageName
                ? customStagePositionMap.get(resolvedVisibleStageName)
                : undefined;
              
              // Determine status based on job-specific visible pipeline sequence when available.
              // Fallback to global stage_order only for older jobs without custom pipeline config.
              if (customStagePositionMap && stagePipelinePosition !== undefined) {
                if (stagePipelinePosition < currentPipelinePosition) {
                  status = "completed";
                } else if (resolvedVisibleStageName === resolvedCurrentVisibleStageName) {
                  status = "current";
                  liveStatus = "waiting";
                } else {
                  status = "pending";
                }
              } else if (s.stage_order < currentStageOrder) {
                status = "completed";
              } else if (s.stage_order === currentStageOrder) {
                status = "current";
                liveStatus = "waiting";
              } else {
                status = "pending";
              }
              
              // Override with event status if exists (for more accurate tracking)
              if (event) {
                if (event.status === "completed" || event.status === "passed") {
                  status = "completed";
                } else if (event.status === "failed") {
                  status = "failed";
                } else if (event.status === "in_progress") {
                  status = "in_progress";
                  isLive = true;
                  liveStatus = "in_interview";
                } else if (event.status === "scheduled" || event.status === "pending") {
                  if (
                    (customStagePositionMap && resolvedVisibleStageName === resolvedCurrentVisibleStageName) ||
                    (!customStagePositionMap && s.stage_order === currentStageOrder)
                  ) {
                    status = "current";
                    liveStatus = "waiting";
                  }
                }
              }
 
              return {
                id: s.id,
                title: displayTitle,
                status,
                isLive,
                liveStatus,
                date: event?.scheduled_at 
                  ? new Date(event.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : event?.completed_at 
                    ? new Date(event.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : undefined,
                notes: event?.notes || undefined,
                score: event?.ai_score || undefined,
                startedAt: event?.created_at || undefined,
                completedAt: event?.completed_at || undefined,
              };
            });
            }

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
              appliedDate: c.applied_at || new Date().toISOString(),
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
          const offerStageOrder = dbStages.find(os => os.name === 'Offer Stage')?.stage_order;
          const defaultStages = dbStages.filter(s => offerStageOrder != null ? s.stage_order <= offerStageOrder : true);
          const interviewSteps: InterviewStep[] = defaultStages.map((s, index) => ({
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
            appliedDate: c.applied_at || new Date().toISOString(),
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
    notes?: string,
    skipEmail?: boolean
  ) => {
    try {
      // Get stage info
      const { data: stageData } = await supabase
        .from('interview_stages')
        .select('id, name, stage_order')
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

      // If stage is completed, always move to next stage
      if (status === 'completed' && nextStage) {
        // Move candidate to next stage
        await supabase
          .from('interview_candidates')
          .update({ 
            current_stage_id: nextStage.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', interviewCandidateId);

        // Send invitation email for next stage (only if not skipped)
        if (!skipEmail) {
          // Skip interview invitation for Offer Stage - offer letter is sent separately
          if (nextStage.name === 'Offer Stage') {
            console.log('Skipping interview invitation for Offer Stage - offer letter should be sent instead');
            toast.success('Candidate advanced to Offer Stage. Send the offer letter from the Offer Stage panel.');
          } else if (nextStage.name.toLowerCase().includes('feedback')) {
            // Feedback stages: send feedback request to observers, NOT interview invitation to candidate
            try {
              const feedbackTypeMap: Record<string, string> = {
                'Demo Feedback': 'demo',
                'HR Feedback': 'hr',
                'Segment Feedback': 'segment',
                'Admin & Academic Feedback': 'admin_academic',
                'Core Team Feedback': 'core_team',
                'Management Round Feedback': 'management',
              };
              const feedbackType = feedbackTypeMap[nextStage.name] || 'demo';
              const feedbackFn = feedbackType === 'hr' ? 'send-hr-feedback-email' : 'send-demo-feedback-email';
              
              const { error: fbError } = await supabase.functions.invoke(feedbackFn, {
                body: { interviewCandidateId, feedbackType }
              });

              if (fbError) {
                console.error('Failed to send feedback email:', fbError);
              } else {
                toast.success(`Feedback request sent to observers for ${nextStage.name}`);
              }
            } catch (emailErr) {
              console.error('Error sending feedback email:', emailErr);
            }
          } else {
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
        }
      }

      // If starting a stage (in_progress), send invitation email for current stage
      // But NOT for feedback stages — those use observer feedback emails
      if (status === 'in_progress' && !skipEmail) {
        const currentStageName = stageData?.name || 'Interview';
        if (currentStageName.toLowerCase().includes('feedback')) {
          console.log('Skipping interview invitation for feedback stage — feedback emails handled separately');
        } else {
          try {
            const scheduledDate = new Date();
            scheduledDate.setHours(scheduledDate.getHours() + 1);
            
            const { error: inviteError } = await supabase.functions.invoke('send-interview-invitation', {
              body: {
                interviewCandidateId,
                stageName: currentStageName,
                scheduledDate: scheduledDate.toISOString(),
              }
            });

            if (inviteError) {
              console.error('Failed to send invitation email:', inviteError);
            } else {
              toast.success(`Interview invitation sent for ${currentStageName}`);
            }
          } catch (emailErr) {
            console.error('Error sending stage invitation:', emailErr);
          }
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

  // Manual refresh only - use the refetch function via Refresh button

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
