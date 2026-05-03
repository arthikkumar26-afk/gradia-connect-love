import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Video,
  Mail,
  UserCheck,
  FileCheck,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Award,
  ThumbsUp,
  TrendingUp,
  Eye,
  RefreshCw,
  Download,
  Palette,
} from "lucide-react";
import { StageResultsModal } from "@/components/employer/StageResultsModal";
import { AllStagesReviewSummary } from "@/components/employer/AllStagesReviewSummary";
import GraphicDesignChallenge from "@/components/candidate/GraphicDesignChallenge";
import ResumeAnalysisReport from "@/components/shared/ResumeAnalysisReport";
import LiveRoundRecorder from "@/components/candidate/LiveRoundRecorder";

interface InterviewStage {
  id: string;
  name: string;
  stage_order: number;
  is_ai_automated: boolean;
}

interface SlotBooking {
  id: string;
  booking_date: string;
  booking_time: string;
  booking_type: string;
  status: string;
  demo_meet_link: string | null;
  demo_meet_type: string | null;
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

interface InterviewResponse {
  id: string;
  interview_event_id: string;
  score: number | null;
  total_questions: number;
  correct_answers: number | null;
  time_taken_seconds: number | null;
  completed_at: string | null;
  recording_url: string | null;
}

interface ManagementReview {
  id: string;
  interview_candidate_id: string;
  reviewer_name: string | null;
  overall_rating: number | null;
  feedback_text: string | null;
  recommendation: string | null;
  strengths: string[] | null;
  areas_for_improvement: string[] | null;
  teaching_skills_rating: number | null;
  communication_rating: number | null;
  subject_knowledge_rating: number | null;
  status: string | null;
  submitted_at: string | null;
  feedback_type: string | null;
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
    pipeline_stages: any | null;
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

// Per-event invitation status pulled from `interview_invitations` so the
// candidate dashboard can display whether the test-link email actually went
// out, and offer a "Resend link" action when it didn't.
interface InvitationStatus {
  email_status: string | null; // 'sent' | 'pending' | 'failed' | null
  email_sent_at: string | null;
  meeting_link: string | null;
  created_at: string;
  expires_at: string | null;
  invitation_token: string | null;
}

export const InterviewPipelineTab = ({ candidateId }: InterviewPipelineTabProps) => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewCandidate[]>([]);
  const [stages, setStages] = useState<InterviewStage[]>([]); // visible stages only
  const [allDbStages, setAllDbStages] = useState<InterviewStage[]>([]); // all DB stages for lookups
  const [isLoading, setIsLoading] = useState(true);
  const [slotBookings, setSlotBookings] = useState<SlotBooking[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [reviews, setReviews] = useState<ManagementReview[]>([]);
  const [liveRecordings, setLiveRecordings] = useState<Array<{
    id: string;
    stage_id: string | null;
    stage_name: string;
    recording_url: string;
    duration_seconds: number | null;
    started_at: string | null;
    ended_at: string | null;
    candidate_id: string | null;
    employer_id: string | null;
    created_at: string;
  }>>([]);
  const [participantNames, setParticipantNames] = useState<{ candidate?: string; employer?: string }>({});
  const [resumeAnalysis, setResumeAnalysis] = useState<any>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedStageForResults, setSelectedStageForResults] = useState<{ stageId: string; stageName: string; interviewCandidateId: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  // Map: interview_event_id -> latest invitation row for that event.
  const [invitationsByEventId, setInvitationsByEventId] = useState<Record<string, InvitationStatus>>({});
  // Tracks which event is currently mid-resend so we can disable the button
  // and swap in a spinner without blocking other resends.
  const [resendingEventId, setResendingEventId] = useState<string | null>(null);
  // User-controlled toggle: when ON, a stalled-pending invitation (no email
  // delivery after >5 min from creation) auto-fires a single resend without
  // requiring a manual click. We track which event IDs we've already
  // auto-resent for so the effect can't loop after the refetch updates state.
  const [autoResendEnabled, setAutoResendEnabled] = useState(false);
  const [autoResentEventIds, setAutoResentEventIds] = useState<Set<string>>(new Set());
  // Wall-clock tick (ms) used to re-evaluate the >5min stall condition without
  // waiting for an unrelated state change. Bumped every 30s.
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  // Snapshot taken right BEFORE a resend fires so we can highlight what
  // changed (token / email-sent-at / expires_at) once the refetch completes.
  // Cleared automatically after a short window so the "Updated just now"
  // affordance doesn't linger.
  const [lastResendSnapshot, setLastResendSnapshot] = useState<
    | {
        eventId: string;
        before: { invitation_token: string | null; email_sent_at: string | null; expires_at: string | null };
        completedAt: number;
      }
    | null
  >(null);
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      toast.success("Pipeline updated!");
    } catch (e) {
      toast.error("Failed to refresh pipeline");
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Re-trigger the test-link email for a stage whose previous invitation
   * either failed or never arrived. Reuses the same edge function the
   * employer/booking flow uses, so the candidate gets the same templated
   * email — just with a fresh `email_sent_at`.
   */
  const handleResendInvitation = async (
    interviewCandidateId: string,
    stageName: string,
    eventId: string,
    scheduledAt: string | null,
  ) => {
    setResendingEventId(eventId);
    // Snapshot what the candidate sees RIGHT NOW so we can render a
    // "before → after" diff once the refetch returns the new row.
    const beforeRow = invitationsByEventId[eventId];
    if (beforeRow) {
      setLastResendSnapshot({
        eventId,
        before: {
          invitation_token: beforeRow.invitation_token,
          email_sent_at: beforeRow.email_sent_at,
          expires_at: beforeRow.expires_at,
        },
        completedAt: 0, // populated on success below
      });
    }
    try {
      const { data, error } = await supabase.functions.invoke('send-interview-invitation', {
        body: {
          interviewCandidateId,
          stageName,
          // Fall back to "now" so the function still has a valid date to
          // render in the email body if the original event lost its schedule.
          scheduledDate: scheduledAt || new Date().toISOString(),
        },
      });
      if (error || (data && data.success === false)) {
        const msg = error?.message || data?.error || 'Failed to resend the test link.';
        toast.error(msg);
        // Roll back the snapshot — there's nothing new to compare against.
        setLastResendSnapshot(null);
      } else {
        toast.success('Test link resent. Please check your inbox.');
        // Refetch invitations so the badge updates from "failed" -> "sent".
        await fetchData();
        // Stamp completion so the "Updated just now" affordance can decay.
        setLastResendSnapshot((prev) =>
          prev && prev.eventId === eventId ? { ...prev, completedAt: Date.now() } : prev,
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend the test link.');
      setLastResendSnapshot(null);
    } finally {
      setResendingEventId(null);
    }
  };

  useEffect(() => {
    fetchData();

    // Realtime: listen for current_stage_id / status changes on interview_candidates
    const channelId = Date.now();
    const candidateChannel = supabase
      .channel(`pipeline-candidate-${candidateId}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_candidates',
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          console.log('Realtime: interview_candidates updated', payload.eventType);
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('Candidates channel status:', status);
      });

    // Realtime: listen for new / updated interview_events
    // We subscribe without filter since events are linked via interview_candidate_id
    // and refetch will filter by candidateId anyway
    const eventsChannel = supabase
      .channel(`pipeline-events-${candidateId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_events',
        },
        (payload) => {
          console.log('Realtime: interview_events updated', payload.eventType);
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('Events channel status:', status);
      });

    // Realtime: listen for management_reviews (feedback submissions)
    const reviewsChannel = supabase
      .channel(`pipeline-reviews-${candidateId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'management_reviews',
        },
        (payload) => {
          console.log('Realtime: management_reviews updated', payload.eventType);
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('Reviews channel status:', status);
      });

    // Realtime: listen for slot_bookings changes
    const bookingsChannel = supabase
      .channel(`pipeline-bookings-${candidateId}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_bookings',
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          console.log('Realtime: slot_bookings updated', payload.eventType);
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('Bookings channel status:', status);
      });

    // Poll every 10 seconds as fallback for realtime issues
    const pollInterval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => {
      supabase.removeChannel(candidateChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(bookingsChannel);
      clearInterval(pollInterval);
    };
  }, [candidateId]);

  const fetchData = async () => {
    try {
      // Fetch interview stages
      const { data: stagesData } = await supabase
        .from('interview_stages')
        .select('*')
        .order('stage_order', { ascending: true });

      const allStages = stagesData || [];
      setAllDbStages(allStages);

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
            pipeline_stages,
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

      setInterviews(interviewsWithEvents as InterviewCandidate[]);

      // Fetch invitation status for every event so we can show whether the
      // candidate's test-link email actually went out, and surface a "Resend
      // link" action when delivery failed or stalled in `pending`.
      const allEventIds = interviewsWithEvents.flatMap(i => i.events.map(e => e.id));
      if (allEventIds.length > 0) {
        const { data: invitations } = await supabase
          .from('interview_invitations')
          .select('interview_event_id, email_status, email_sent_at, meeting_link, created_at, expires_at, invitation_token')
          .in('interview_event_id', allEventIds)
          .order('created_at', { ascending: false });
        // Keep only the latest invitation per event (most-recent resend wins).
        const map: Record<string, InvitationStatus> = {};
        for (const row of invitations || []) {
          if (!map[row.interview_event_id]) {
            map[row.interview_event_id] = {
              email_status: row.email_status,
              email_sent_at: row.email_sent_at,
              meeting_link: row.meeting_link,
              created_at: row.created_at,
              expires_at: row.expires_at,
              invitation_token: row.invitation_token,
            };
          }
        }
        setInvitationsByEventId(map);
      } else {
        setInvitationsByEventId({});
      }

      // Determine visible stages based on the first interview's job pipeline
      const firstInterview = interviewsWithEvents[0];
      const jobPipeline = (firstInterview?.job as any)?.pipeline_stages as Array<{ name: string; order: number }> | null;

      // Hidden stages skipped in candidate view.
      // - 'Demo Round' is replaced by 'Demo Feedback' card.
      // - 'Written Test Feedback' is redundant: 'Written Test' card already shows score, correct/total, time and AI feedback.
      // - 'HR Feedback' / 'HR Round Feedback' are redundant: HR outcome is delivered to the candidate via email; the 'HR Round' card already represents the stage.
      const hiddenRoundStages = new Set([
        'Demo Round',
        'Written Test Feedback',
        'HR Feedback',
        'HR Round Feedback',
      ]);

      let filteredStages: InterviewStage[];
      if (jobPipeline && jobPipeline.length > 0) {
        // Use job-specific pipeline: map pipeline names to actual stage records
        const pipelineNames = new Set(jobPipeline.map(ps => ps.name));
        // Ensure Interview Guidelines is always present
        pipelineNames.add('Interview Guidelines');
        // Auto-inject round stages if pipeline has slot booking but not the round itself
        const roundInjections: Array<{ slotName: string; roundName: string }> = [
          { slotName: 'Segment Round Slot Booking', roundName: 'Segment Round' },
          { slotName: 'Admin & Academic Round Slot Booking', roundName: 'Admin & Academic Round' },
          { slotName: 'Core Team Round Slot Booking', roundName: 'Core Team Round' },
          { slotName: 'Management Round Slot Booking', roundName: 'Management Round' },
          { slotName: 'HR Round Slot Booking', roundName: 'HR Round' },
        ];
        for (const { slotName, roundName } of roundInjections) {
          if (pipelineNames.has(slotName) && !pipelineNames.has(roundName)) {
            pipelineNames.add(roundName);
          }
        }

        // First try matching DB stages by name
        const matchedStages = allStages.filter(s => pipelineNames.has(s.name) && !hiddenRoundStages.has(s.name));
        
        if (matchedStages.length >= jobPipeline.length * 0.5) {
          // Enough DB stages matched — use them with proper ordering
          filteredStages = matchedStages.sort((a, b) => {
            const getOrder = (s: InterviewStage) => {
              const pipelineEntry = jobPipeline.find(p => p.name === s.name);
              if (pipelineEntry) return pipelineEntry.order;
              const roundToSlotMap: Record<string, string> = {
                'Segment Round': 'Segment Round Slot Booking',
                'Admin & Academic Round': 'Admin & Academic Round Slot Booking',
                'Core Team Round': 'Core Team Round Slot Booking',
                'Management Round': 'Management Round Slot Booking',
                'HR Round': 'HR Round Slot Booking',
              };
              const slotName = roundToSlotMap[s.name];
              if (slotName) {
                const slotOrder = jobPipeline.find(p => p.name === slotName)?.order ?? s.stage_order;
                return slotOrder + 0.5;
              }
              return s.stage_order;
            };
            return getOrder(a) - getOrder(b);
          });
        } else {
          // Custom pipeline names don't match DB stages — create virtual stages from pipeline config
          filteredStages = jobPipeline
            .filter(ps => !hiddenRoundStages.has(ps.name))
            .sort((a, b) => a.order - b.order)
            .map((ps) => {
              // Try to find a matching DB stage first
              const dbStage = allStages.find(s => s.name === ps.name);
              if (dbStage) return dbStage;
              // Create a virtual stage entry
              return {
                id: `virtual-${ps.order}`,
                name: ps.name,
                stage_order: ps.order,
                is_ai_automated: !!(ps as any).isAutomated,
              } as InterviewStage;
            });
        }
      } else {
        // Default pipeline: filter out hidden rounds
        filteredStages = allStages.filter(s => !hiddenRoundStages.has(s.name));
      }

      setStages(filteredStages);

      if (interviewsWithEvents.length > 0) {
        const targetId = selectedInterview && interviewsWithEvents.some(i => i.id === selectedInterview)
          ? selectedInterview
          : interviewsWithEvents[0].id;
        setSelectedInterview(targetId);
        const targetInterview = interviewsWithEvents.find(i => i.id === targetId) || interviewsWithEvents[0];
        await fetchReviewData(targetInterview as InterviewCandidate);
      }

      // Fetch slot bookings for this candidate
      const { data: bookingsData } = await supabase
        .from('slot_bookings')
        .select('id, booking_date, booking_time, booking_type, status, demo_meet_link, demo_meet_type')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      setSlotBookings(bookingsData || []);

      // Fetch resume analysis as fallback for CV/Resume stage score
      const { data: resumeData } = await supabase
        .from('resume_analyses')
        .select('overall_score, strengths, improvements, skill_highlights, experience_summary, career_level')
        .eq('user_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setResumeAnalysis(resumeData);
    } catch (error) {
      console.error('Error fetching interview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviewData = async (interview: InterviewCandidate) => {
    try {
      // Fetch interview responses (test scores)
      const eventIds = interview.events.map(e => e.id);
      if (eventIds.length > 0) {
        const { data: responsesData } = await supabase
          .from('interview_responses')
          .select('id, interview_event_id, score, total_questions, correct_answers, time_taken_seconds, completed_at, recording_url')
          .in('interview_event_id', eventIds);
        setResponses(responsesData || []);
      }

      // Fetch management reviews (feedback from observers)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('management_reviews')
        .select('id, interview_candidate_id, reviewer_name, overall_rating, feedback_text, recommendation, strengths, areas_for_improvement, teaching_skills_rating, communication_rating, subject_knowledge_rating, status, submitted_at, feedback_type')
        .eq('interview_candidate_id', interview.id)
        .eq('status', 'submitted');
      
      if (reviewsError) {
        console.error('[Pipeline] Error fetching reviews:', reviewsError);
      }
      setReviews(reviewsData || []);

      // Live round recordings (Demo/HR/Management/etc.)
      const { data: recordingsData } = await supabase
        .from('live_round_recordings')
        .select('id, stage_id, stage_name, recording_url, duration_seconds, started_at, ended_at, candidate_id, employer_id, created_at')
        .eq('interview_candidate_id', interview.id)
        .order('created_at', { ascending: false });
      setLiveRecordings(recordingsData || []);

      // Resolve participant display names (candidate + employer/company)
      const candId = recordingsData?.[0]?.candidate_id || candidateId;
      const empId = recordingsData?.[0]?.employer_id || null;
      const ids = [candId, empId].filter(Boolean) as string[];
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, role')
          .in('id', ids);
        const next: { candidate?: string; employer?: string } = {};
        for (const p of profs || []) {
          if (p.id === candId) next.candidate = p.full_name || 'Candidate';
          if (p.id === empId) next.employer = p.company_name || p.full_name || 'Employer';
        }
        setParticipantNames(next);
      } else {
        setParticipantNames({});
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
    }
  };

  // When selected interview changes, fetch its review data
  useEffect(() => {
    if (selectedInterview) {
      const interview = interviews.find(i => i.id === selectedInterview);
      if (interview) {
        fetchReviewData(interview);
      }
    }
  }, [selectedInterview]);

  // Heartbeat — re-renders the panel every 30s so "stalled >5min" / "expires
  // soon" / "Updated just now" affordances update without depending on
  // unrelated state changes. 30s is enough granularity for minute-scale UI
  // cues without burning render cycles.
  useEffect(() => {
    // 1s tick so the live expiry countdown updates every second. This also
    // keeps the >5min stall / "expires soon" affordances fresh — well within
    // the cost of a single setState per second on this panel.
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-resend: when the user has opted in via the toggle, watch the latest
  // test invitation for the selected interview. If it's been "pending" for
  // more than 5 minutes with no email_sent_at, fire ONE resend automatically.
  // We dedupe on the eventId to guarantee at-most-once per stalled invitation,
  // and skip if a manual resend is already in flight.
  useEffect(() => {
    if (!autoResendEnabled || !selectedInterview) return;
    const interview = interviews.find((i) => i.id === selectedInterview);
    if (!interview) return;

    const stageNameById = new Map(allDbStages.map((s) => [s.id, s.name]));
    const TEST_KEYWORDS = ['written test', 'technical', 'coding test', 'aptitude', 'mcq', 'assessment'];
    const isTest = (n: string) => TEST_KEYWORDS.some((k) => n.toLowerCase().includes(k));

    for (const ev of interview.events) {
      const inv = invitationsByEventId[ev.id];
      if (!inv) continue;
      const stageName = stageNameById.get(ev.stage_id) || '';
      if (!isTest(stageName)) continue;
      const stalled =
        inv.email_status === 'pending' &&
        !inv.email_sent_at &&
        nowTick - new Date(inv.created_at).getTime() > 5 * 60 * 1000;
      if (!stalled) continue;
      if (autoResentEventIds.has(ev.id)) continue;
      if (resendingEventId === ev.id) continue;

      // Mark BEFORE awaiting so the next render can't double-trigger.
      setAutoResentEventIds((prev) => {
        const next = new Set(prev);
        next.add(ev.id);
        return next;
      });
      toast.info('Auto-resending stalled test link…');
      void handleResendInvitation(interview.id, stageName, ev.id, ev.scheduled_at);
      // Only one auto-fire per tick — break out so we don't stampede.
      break;
    }
    // We intentionally exclude `handleResendInvitation` from deps — it's
    // stable enough for this read-only fire-and-forget use, and including
    // it would require a useCallback refactor outside the scope of this fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResendEnabled, nowTick, invitationsByEventId, selectedInterview, interviews, allDbStages, autoResentEventIds, resendingEventId]);


  const getStageIcon = (stageName: string) => {
    switch (stageName) {
      case 'Interview Guidelines':
        return Mail;
      case 'CV/Resume':
      case 'Resume Screening':
        return FileText;
      case 'Written Test Slot Booking':
        return Calendar;
      case 'Written Test':
      case 'Technical Assessment':
        return Code;
      case 'Demo Slot Booking':
        return Calendar;
      case 'Demo Round':
        return Video;
      case 'Demo Feedback':
      case 'Segment Feedback':
      case 'Admin & Academic Feedback':
      case 'Core Team Feedback':
      case 'Management Round Feedback':
        return MessageSquare;
      case 'Segment Round Slot Booking':
      case 'Admin & Academic Round Slot Booking':
      case 'Core Team Round Slot Booking':
      case 'Management Round Slot Booking':
        return Calendar;
      case 'HR Round Slot Booking':
        return Calendar;
      case 'HR Round':
        return UserCheck;
      case 'HR Feedback':
        return MessageSquare;
      case 'Design Challenge':
        return Palette;
      case 'Final Review':
        return FileCheck;
      case 'Offer Stage':
        return Gift;
      default:
        return CheckCircle2;
    }
  };

  // Map hidden round stage names to their visible feedback counterpart
  const hiddenToVisibleName: Record<string, string> = {
    'Demo Round': 'Demo Feedback',
  };

  // Resolve a stageId (possibly hidden) to an index in the visible `stages` array
  const resolveVisibleIndex = (stageId: string | null): number => {
    if (!stageId) return -1;
    // Direct match in visible stages
    const directIdx = stages.findIndex(s => s.id === stageId);
    if (directIdx !== -1) return directIdx;

    // stageId is a hidden round — find its name from allDbStages, then map to visible
    const dbStage = allDbStages.find(s => s.id === stageId);
    if (dbStage) {
      const visibleName = hiddenToVisibleName[dbStage.name];
      if (visibleName) {
        return stages.findIndex(s => s.name === visibleName);
      }
    }
    return -1;
  };

  const roundFeedbackTypeMap: Record<string, string> = {
    'Demo Round': 'demo',
    'Segment Round': 'segment',
    'Admin & Academic Round': 'admin_academic',
    'Core Team Round': 'core_team',
    'Management Round': 'management',
    'HR Round': 'hr',
  };

  // Map feedback stage names to their feedback_type
  const feedbackStageFeedbackTypeMap: Record<string, string> = {
    'Demo Feedback': 'demo',
    'Segment Feedback': 'segment',
    'Admin & Academic Feedback': 'admin_academic',
    'Core Team Feedback': 'core_team',
    'Management Round Feedback': 'management',
    'HR Feedback': 'hr',
  };

  const hasSubmittedFeedbackForType = (feedbackType?: string) => {
    if (!feedbackType) return false;

    return reviews.some(
      (review) =>
        review.status === 'submitted' &&
        (review.feedback_type === feedbackType || (feedbackType === 'demo' && !review.feedback_type))
    );
  };

  const hasSubmittedFeedbackForRoundStage = (stageName: string) => {
    return hasSubmittedFeedbackForType(roundFeedbackTypeMap[stageName]);
  };

  const hasSubmittedFeedbackForFeedbackStage = (stageName: string) => {
    return hasSubmittedFeedbackForType(feedbackStageFeedbackTypeMap[stageName]);
  };

  // Check if the stage immediately before the given index is a feedback stage with submitted reviews
  const isPreviousFeedbackStageCompleted = (stageIndex: number) => {
    if (stageIndex <= 0) return false;
    const prevStage = stages[stageIndex - 1];
    if (!prevStage) return false;
    return hasSubmittedFeedbackForFeedbackStage(prevStage.name);
  };

  const getStageStatus = (stageId: string, stageName: string, events: InterviewEvent[], currentStageId: string | null, interview?: InterviewCandidate) => {
    // Check for completed or passed events first
    const completedEvent = events.find(e => e.stage_id === stageId && (e.status === 'completed' || e.status === 'passed'));
    if (completedEvent) return 'completed';

    // Round stages completed when feedback is submitted
    if (hasSubmittedFeedbackForRoundStage(stageName)) return 'completed';

    // Feedback stages completed when their reviews are submitted
    if (hasSubmittedFeedbackForFeedbackStage(stageName)) return 'completed';

    const stageIndex = stages.findIndex(s => s.id === stageId);
    
    // Use effective current index computed from events if interview is available
    const currentStageIndex = interview 
      ? getEffectiveCurrentIndex(interview)
      : resolveVisibleIndex(currentStageId);

    // If current stage has advanced past this stage, it's completed
    if (stageIndex !== -1 && currentStageIndex !== -1 && stageIndex < currentStageIndex) {
      return 'completed';
    }

    // Check for any event for this stage
    const event = events.find(e => e.stage_id === stageId);
    if (event) {
      if (stageIndex !== -1 && currentStageIndex !== -1 && stageIndex === currentStageIndex) {
        return 'current';
      }
      return event.status;
    }

    if (stageIndex !== -1 && currentStageIndex !== -1 && stageIndex === currentStageIndex) {
      return 'current';
    }

    // If previous stage is a feedback stage with submitted reviews, this becomes current
    if (stageIndex !== -1 && isPreviousFeedbackStageCompleted(stageIndex)) {
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

  const liveRoundBookingTypeMap: Record<string, string[]> = {
    'Demo Round': ['demo_round', 'Demo Round'],
    'Segment Round': ['segment_round', 'Segment Round'],
    'Admin & Academic Round': ['admin_academic_round', 'Admin & Academic Round'],
    'Core Team Round': ['core_team_round', 'Core Team Round'],
    'Management Round': ['management_round', 'Management Round'],
    'HR Round': ['hr_round', 'HR Round'],
  };

  const roundSlotStageNameMap: Record<string, string> = {
    'Segment Round': 'Segment Round Slot Booking',
    'Admin & Academic Round': 'Admin & Academic Round Slot Booking',
    'Core Team Round': 'Core Team Round Slot Booking',
    'Management Round': 'Management Round Slot Booking',
    'HR Round': 'HR Round Slot Booking',
  };

  const getLiveRoundBooking = (stageName: string) => {
    const bookingTypes = liveRoundBookingTypeMap[stageName] || [];
    if (!bookingTypes.length) return null;

    return slotBookings.find((booking) => bookingTypes.includes(booking.booking_type)) || null;
  };

  const isBookingTimeReached = (booking: SlotBooking | null | undefined): boolean => {
    if (!booking?.booking_date || !booking?.booking_time) return false;
    // booking_time is "HH:mm" wall-clock in user's timezone; combining locally is acceptable here.
    const slotMs = new Date(`${booking.booking_date}T${booking.booking_time}:00`).getTime();
    if (Number.isNaN(slotMs)) return false;
    return Date.now() >= slotMs;
  };

  const getLiveRoundJoinAction = (stageName: string, interviewCandidateId: string, stageId: string) => {
    if (hasSubmittedFeedbackForRoundStage(stageName)) {
      return null;
    }

    const booking = getLiveRoundBooking(stageName);

    if (!booking) {
      return null;
    }

    // Allow joining once the booking is confirmed OR the scheduled slot time
    // has arrived (covers AI-video flows where employer confirmation isn't required).
    const timeReached = isBookingTimeReached(booking);
    if (booking.status !== 'confirmed' && !timeReached) {
      return null;
    }

    if (booking.demo_meet_link) {
      return {
        href: booking.demo_meet_link,
        external: true,
      };
    }

    // AI-video demo: route to the platform-hosted demo round once time has arrived.
    if (booking.demo_meet_type === 'ai_video' && timeReached && stageName === 'Demo Round') {
      return {
        href: `/candidate/demo-round?interviewCandidateId=${interviewCandidateId}&stageId=${stageId}`,
        external: false,
      };
    }

    return null;
  };

  // Compute the effective current stage index from completed events + feedback
  const getEffectiveCurrentIndex = (interview: InterviewCandidate): number => {
    // Find the highest completed stage index
    let highestCompleted = -1;
    stages.forEach((stage, idx) => {
      const completedEvent = interview.events.find(
        e => e.stage_id === stage.id && (e.status === 'completed' || e.status === 'passed')
      );
      if (completedEvent) {
        highestCompleted = Math.max(highestCompleted, idx);
      }
      // Check round feedback completion
      if (hasSubmittedFeedbackForRoundStage(stage.name)) {
        highestCompleted = Math.max(highestCompleted, idx);
      }
      if (hasSubmittedFeedbackForFeedbackStage(stage.name)) {
        highestCompleted = Math.max(highestCompleted, idx);
      }
    });

    // The current stage is the one after the highest completed
    const effectiveIdx = highestCompleted + 1;
    
    // Also consider the DB current_stage_id as a fallback
    const dbIdx = resolveVisibleIndex(interview.current_stage_id);
    
    return Math.max(effectiveIdx, dbIdx !== -1 ? dbIdx : 0);
  };

  const getCurrentStageOrder = (interview: InterviewCandidate) => {
    const idx = getEffectiveCurrentIndex(interview);
    return Math.min(idx + 1, stages.length);
  };

  const renderStarRating = (rating: number | null, max: number = 5) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">({rating}/{max})</span>
      </div>
    );
  };

  const getStageReviewContent = (stage: InterviewStage, event: InterviewEvent | undefined) => {
    const currentInterview = interviews.find(i => i.id === selectedInterview);
    if (!currentInterview) return null;

    const status = getStageStatus(stage.id, stage.name, currentInterview.events, currentInterview.current_stage_id, currentInterview);
    const isFinalReview = stage.name === 'Final Review';
    const isDesignChallenge = stage.name === 'Design Challenge';
    if (!isFinalReview && !isDesignChallenge && status !== 'completed' && status !== 'passed') return null;

    switch (stage.name) {
      case 'Interview Guidelines': {
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Interview guidelines email sent successfully!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Please check your inbox for the interview instructions and guidelines before proceeding.
            </p>
          </div>
        );
      }
      case 'CV/Resume':
      case 'Resume Screening': {
        // Get analysis from multiple sources: event ai_feedback > interview ai_analysis > resume_analyses table
        const eventFeedback = event?.ai_feedback && typeof event.ai_feedback === 'object' ? event.ai_feedback as any : null;
        const interviewAnalysis = currentInterview.ai_analysis && typeof currentInterview.ai_analysis === 'object' && (currentInterview.ai_analysis as any)?.overall_score ? currentInterview.ai_analysis : null;
        const analysis = eventFeedback?.overall_score ? eventFeedback : interviewAnalysis || resumeAnalysis;
        const score = event?.ai_score || (analysis?.overall_score) || null;
        
        if (!score && !analysis) {
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">ATS analysis is being processed...</span>
              </div>
            </div>
          );
        }
        
        return (
          <div className="space-y-3">
            {score != null && score > 0 && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">ATS Score:</span>
                <Badge className={`${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                  {score}%
                </Badge>
              </div>
            )}
            {/* Detailed Resume Analysis Report */}
            <ResumeAnalysisReport 
              userId={candidateId} 
              data={resumeAnalysis ? {
                overall_score: resumeAnalysis.overall_score || 0,
                career_level: resumeAnalysis.career_level || '',
                experience_summary: resumeAnalysis.experience_summary || '',
                strengths: resumeAnalysis.strengths || [],
                improvements: resumeAnalysis.improvements || [],
                skill_highlights: resumeAnalysis.skill_highlights || [],
              } : undefined}
            />
            {analysis?.skill_match_score != null && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Skills</p>
                  <p className="font-semibold text-foreground">{analysis.skill_match_score}%</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="font-semibold text-foreground">{analysis.experience_match_score || 0}%</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold text-foreground">{analysis.location_match_score || 0}%</p>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'Written Test':
      case 'Technical Assessment': {
        const response = event ? responses.find(r => r.interview_event_id === event.id) : null;
        const score = event?.ai_score;
        const feedback = event?.ai_feedback && typeof event.ai_feedback === 'object' ? event.ai_feedback as any : null;
        const correctAnswers = response?.correct_answers ?? feedback?.correctAnswers;
        const totalQuestions = response?.total_questions ?? feedback?.totalQuestions;
        const timeTaken = response?.time_taken_seconds ?? feedback?.timeTaken;
        return (
          <div className="space-y-3">
            {score != null && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Score:</span>
                <Badge className={`${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                  {score}%
                </Badge>
              </div>
            )}
            {(correctAnswers != null || totalQuestions != null) && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Correct</p>
                  <p className="font-semibold text-foreground">{correctAnswers ?? 0}/{totalQuestions ?? 0}</p>
                </div>
                {timeTaken != null && (
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Time Taken</p>
                    <p className="font-semibold text-foreground">{timeTaken < 120 ? `${timeTaken} sec` : `${Math.round(timeTaken / 60)} min`}</p>
                  </div>
                )}
              </div>
            )}
            {event?.ai_feedback && typeof event.ai_feedback === 'string' && (
              <p className="text-sm text-muted-foreground">{event.ai_feedback}</p>
            )}
            {response?.recording_url && (
              <div className="mt-2">
                <button
                  onClick={() => {
                    const videoWindow = window.open('', '_blank');
                    if (videoWindow) {
                      videoWindow.document.write(`
                        <!DOCTYPE html>
                        <html><head><title>Written Test Recording</title>
                        <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;}
                        video{max-width:100%;max-height:100%;}</style></head>
                        <body><video controls autoplay src="${response.recording_url}"></video></body></html>
                      `);
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/30 px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <Video className="h-4 w-4" />
                  Watch Test Recording
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'Demo Round': {
        const score = event?.ai_score;
        // Find demo slot booking to get meeting info
        const demoBooking = slotBookings.find(b => 
          b.booking_type === 'demo_round' || b.booking_type === 'Demo Round'
        );
        const meetType = demoBooking?.demo_meet_type;
        const meetLink = demoBooking?.demo_meet_link;
        
        return (
          <div className="space-y-3">
            {/* Meeting Info */}
            {meetType && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {meetType === 'ai_video' ? 'AI Video Interview' : 
                     meetType === 'google_meet' || meetType === 'manual_link' ? 'Google Meet / Zoom' : 
                     meetType === 'zoom_meet' ? 'Zoom Meeting' : 'Live Demo Session'}
                  </span>
                </div>
                {meetLink && (
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Video className="h-4 w-4" />
                    Join Meeting
                  </a>
                )}
                {meetType === 'ai_video' && !meetLink && (
                  <p className="text-sm text-muted-foreground">
                    AI-powered demo session. Check your email for the session link.
                  </p>
                )}
              </div>
            )}
            {!meetType && (
              <p className="text-sm text-muted-foreground">
                Live demo session. Check your email for meeting details.
              </p>
            )}
            {score != null && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Demo Score:</span>
                <Badge className={`${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                  {score}%
                </Badge>
              </div>
            )}
            {event?.notes && (
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            )}
          </div>
        );
      }

      case 'Segment Round': {
        const segBooking = getLiveRoundBooking(stage.name);
        const segJoinAction = getLiveRoundJoinAction(stage.name, currentInterview.id, stage.id);
        const segMeetType = segBooking?.demo_meet_type;
        
        return (
          <div className="space-y-3">
            {segMeetType && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {segMeetType === 'ai_video' ? 'AI Video Interview' : 
                     segMeetType === 'google_meet' || segMeetType === 'manual_link' ? 'Google Meet / Zoom' : 
                     segMeetType === 'zoom_meet' ? 'Zoom Meeting' : 'Live Interview Session'}
                  </span>
                </div>
                {segJoinAction && (
                  segJoinAction.external ? (
                    <a
                      href={segJoinAction.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Video className="h-4 w-4" />
                      Join Meeting
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(segJoinAction.href)}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Video className="h-4 w-4" />
                      Join Meeting
                    </button>
                  )
                )}
                {segMeetType === 'ai_video' && !segJoinAction && (
                  <p className="text-sm text-muted-foreground">
                    AI-powered session. Your join button will appear here once the employer confirms the round.
                  </p>
                )}
              </div>
            )}
            {!segMeetType && (
              <p className="text-sm text-muted-foreground">
                Live interview session. Awaiting meeting link from employer.
              </p>
            )}
            {event?.ai_score != null && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Score:</span>
                <Badge className={`${event.ai_score >= 70 ? 'bg-green-500' : event.ai_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                  {event.ai_score}%
                </Badge>
              </div>
            )}
            {event?.notes && (
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            )}
          </div>
        );
      }

      case 'Admin & Academic Round':
      case 'Core Team Round':
      case 'Management Round':
      case 'HR Round': {
        const roundBooking = getLiveRoundBooking(stage.name);
        const roundJoinAction = getLiveRoundJoinAction(stage.name, currentInterview.id, stage.id);
        const roundMeetType = roundBooking?.demo_meet_type;
        
        return (
          <div className="space-y-3">
            {roundMeetType && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {roundMeetType === 'ai_video' ? 'AI Video Interview' : 
                     roundMeetType === 'google_meet' || roundMeetType === 'manual_link' ? 'Google Meet / Zoom' : 
                     roundMeetType === 'zoom_meet' ? 'Zoom Meeting' : 'Live Interview Session'}
                  </span>
                </div>
                {roundJoinAction && (
                  roundJoinAction.external ? (
                    <a
                      href={roundJoinAction.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Video className="h-4 w-4" />
                      Join Meeting
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(roundJoinAction.href)}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Video className="h-4 w-4" />
                      Join Meeting
                    </button>
                  )
                )}
              </div>
            )}
            {!roundMeetType && (
              <p className="text-sm text-muted-foreground">
                Live interview session. Awaiting meeting link from employer.
              </p>
            )}
            {event?.ai_score != null && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Score:</span>
                <Badge className={`${event.ai_score >= 70 ? 'bg-green-500' : event.ai_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                  {event.ai_score}%
                </Badge>
              </div>
            )}
            {event?.notes && (
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            )}
          </div>
        );
      }

      case 'Demo Feedback':
      case 'Segment Feedback':
      case 'Admin & Academic Feedback':
      case 'Core Team Feedback':
      case 'Management Round Feedback': {
        const feedbackTypeMap: Record<string, string> = {
          'Demo Feedback': 'demo',
          'Segment Feedback': 'segment',
          'Admin & Academic Feedback': 'admin_academic',
          'Core Team Feedback': 'core_team',
          'Management Round Feedback': 'management',
        };
        const fbType = feedbackTypeMap[stage.name] || 'demo';
        const submittedReviews = reviews.filter(r => r.status === 'submitted' && (
          r.feedback_type === fbType || (fbType === 'demo' && !r.feedback_type)
        ));
        if (submittedReviews.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">Feedback collected from observers.</p>
          );
        }
        return (
          <div className="space-y-3">
            {submittedReviews.map((review, idx) => (
              <div key={review.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {review.reviewer_name || `Reviewer ${idx + 1}`}
                  </span>
                  {review.recommendation && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        review.recommendation === 'strongly_recommend' || review.recommendation === 'recommend' 
                          ? 'border-green-500/30 text-green-600' 
                          : review.recommendation === 'not_recommend' 
                          ? 'border-red-500/30 text-red-600' 
                          : 'border-yellow-500/30 text-yellow-600'
                      }`}
                    >
                      {review.recommendation === 'strongly_recommend' ? '✅ Strongly Recommended' :
                       review.recommendation === 'recommend' ? '✅ Recommended' :
                       review.recommendation === 'needs_improvement' ? '⚠️ Needs Improvement' :
                       review.recommendation === 'not_recommend' ? '❌ Not Recommended' :
                       review.recommendation}
                    </Badge>
                  )}
                </div>
                
                {review.overall_rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Overall:</span>
                    {renderStarRating(review.overall_rating)}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {review.teaching_skills_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Teaching</p>
                      {renderStarRating(review.teaching_skills_rating)}
                    </div>
                  )}
                  {review.communication_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Communication</p>
                      {renderStarRating(review.communication_rating)}
                    </div>
                  )}
                  {review.subject_knowledge_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Knowledge</p>
                      {renderStarRating(review.subject_knowledge_rating)}
                    </div>
                  )}
                </div>

                {review.strengths && review.strengths.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Strengths:</p>
                    <div className="flex flex-wrap gap-1">
                      {review.strengths.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          <ThumbsUp className="h-2.5 w-2.5 mr-0.5 text-green-500" /> {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {review.feedback_text && (
                  <p className="text-xs text-muted-foreground italic">"{review.feedback_text}"</p>
                )}
              </div>
            ))}
          </div>
        );
      }

      case 'HR Feedback': {
        const hrReviews = reviews.filter(r => r.status === 'submitted' && r.feedback_type === 'hr');
        if (hrReviews.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">HR Feedback collected from observers.</p>
          );
        }
        return (
          <div className="space-y-3">
            {hrReviews.map((review, idx) => (
              <div key={review.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {review.reviewer_name || `Reviewer ${idx + 1}`}
                  </span>
                  {review.recommendation && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        review.recommendation === 'strongly_recommend' || review.recommendation === 'recommend' 
                          ? 'border-green-500/30 text-green-600' 
                          : review.recommendation === 'not_recommend' 
                          ? 'border-red-500/30 text-red-600' 
                          : 'border-yellow-500/30 text-yellow-600'
                      }`}
                    >
                      {review.recommendation === 'strongly_recommend' ? '✅ Strongly Recommended' :
                       review.recommendation === 'recommend' ? '✅ Recommended' :
                       review.recommendation === 'needs_improvement' ? '⚠️ Needs Improvement' :
                       review.recommendation === 'not_recommend' ? '❌ Not Recommended' :
                       review.recommendation}
                    </Badge>
                  )}
                </div>
                
                {review.overall_rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Overall:</span>
                    {renderStarRating(review.overall_rating)}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {review.communication_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Communication</p>
                      {renderStarRating(review.communication_rating)}
                    </div>
                  )}
                  {review.subject_knowledge_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Cultural Fit</p>
                      {renderStarRating(review.subject_knowledge_rating)}
                    </div>
                  )}
                </div>

                {review.feedback_text && (
                  <p className="text-xs text-muted-foreground italic">"{review.feedback_text}"</p>
                )}
              </div>
            ))}
          </div>
        );
      }


      case 'Design Challenge': {
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">AI Design Challenge</span>
            </div>
            <GraphicDesignChallenge />
          </div>
        );
      }

      case 'Final Review': {
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">Complete Interview Summary</span>
              </div>
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
            {currentInterview && (
              <AllStagesReviewSummary interviewCandidateId={currentInterview.id} />
            )}
          </div>
        );
      }

      case 'Offer Stage': {
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Offer Extended! 🎉</span>
            </div>
            <p className="text-sm text-muted-foreground">Check your email for the offer letter details.</p>
          </div>
        );
      }

      default: {
        // Handle slot booking stages
        if (stage.name.toLowerCase().includes('slot booking')) {
          const isWritten = stage.name.toLowerCase().includes('written');
          const isDemo = stage.name.toLowerCase().includes('demo');
          const isHr = stage.name.toLowerCase().includes('hr');
          const isSegment = stage.name.toLowerCase().includes('segment');
          const isAdminAcademic = stage.name.toLowerCase().includes('admin') && stage.name.toLowerCase().includes('academic');
          const isCoreTeam = stage.name.toLowerCase().includes('core team');
          const isManagement = stage.name.toLowerCase().includes('management');
          const bookingType = isDemo ? 'demo_round' : isHr ? 'hr_round' : isSegment ? 'segment_round' : isAdminAcademic ? 'admin_academic_round' : isCoreTeam ? 'core_team_round' : isManagement ? 'management_round' : isWritten ? 'written_test' : 'technical_assessment';
          const stageLabel = isDemo ? 'Demo Round' : isHr ? 'HR Round' : isSegment ? 'Segment Round' : isAdminAcademic ? 'Admin & Academic Round' : isCoreTeam ? 'Core Team Round' : isManagement ? 'Management Round' : isWritten ? 'Written Test' : stage.name;
          
          const booking = slotBookings.find(b => 
            b.booking_type === bookingType || b.booking_type === stageLabel
          );
          
          if (booking) {
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Slot Booked Successfully</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold text-foreground">{formatDate(booking.booking_date)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-semibold text-foreground">{booking.booking_time}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs ${
                  booking.status === 'confirmed' ? 'border-green-500/30 text-green-600' : 'border-yellow-500/30 text-yellow-600'
                }`}>
                  {booking.status === 'confirmed' ? '✅ Confirmed' : '⏳ ' + (booking.status || 'Pending')}
                </Badge>
              </div>
            );
          }
          return <p className="text-sm text-muted-foreground">Slot booking completed.</p>;
        }

        if (event?.ai_score) {
          return (
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-sm">Score: {event.ai_score}%</span>
            </div>
          );
        }
        return <p className="text-sm text-muted-foreground">Stage completed.</p>;
      }
    }
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

  // Find the most recent test-stage invitation for the selected interview so
  // we can render an at-a-glance status panel: was a token created? did the
  // email send? when does the link expire? Stages considered "tests" are the
  // ones that issue a tokenised link (Written Test, Technical Assessment,
  // Coding Test, Mock Interview, Aptitude Test).
  const TEST_STAGE_KEYWORDS = ["written test", "technical", "coding", "aptitude", "mock interview", "assessment"];
  const isTestStageName = (name: string) => {
    const n = name.toLowerCase();
    return TEST_STAGE_KEYWORDS.some(k => n.includes(k));
  };
  const stageNameById = new Map(allDbStages.map(s => [s.id, s.name]));
  // Walk events in reverse-chronological order (by created invitation, falling
  // back to event order in the array — already newest-first because the fetch
  // sorts by created_at DESC). Pick the first event whose stage looks like a
  // test AND has an invitation row.
  const latestTestInvitation = (() => {
    const candidates = currentInterview.events
      .map(ev => {
        const inv = invitationsByEventId[ev.id];
        if (!inv) return null;
        const stageName = stageNameById.get(ev.stage_id) || "";
        if (!isTestStageName(stageName)) return null;
        return { event: ev, invitation: inv, stageName };
      })
      .filter((x): x is { event: InterviewEvent; invitation: InvitationStatus; stageName: string } => x !== null)
      .sort((a, b) => new Date(b.invitation.created_at).getTime() - new Date(a.invitation.created_at).getTime());
    return candidates[0] || null;
  })();

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowReportModal(true)}
          disabled={!currentInterview}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-primary bg-primary/10 hover:bg-primary/20 text-primary transition-all disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download Report
        </button>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background hover:bg-accent text-foreground transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
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

      {/* Latest Test Invitation Status — at-a-glance dashboard panel showing
          whether an invitation token was created, whether the email actually
          went out, and when the link expires. Only rendered for the latest
          tokenised test stage on the selected interview. */}
      {latestTestInvitation && (() => {
        const { invitation, stageName, event } = latestTestInvitation;
        const tokenCreated = !!invitation.invitation_token;
        const emailSent = invitation.email_status === 'sent' && !!invitation.email_sent_at;
        const emailFailed = invitation.email_status === 'failed';
        // Use the heartbeat tick so the "stalled" badge flips on at the
        // 5-minute mark even if no other state changes in between.
        const emailPendingStalled =
          invitation.email_status === 'pending' &&
          !invitation.email_sent_at &&
          (nowTick - new Date(invitation.created_at).getTime()) > 5 * 60 * 1000;
        const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
        const expired = expiresAt ? expiresAt.getTime() < nowTick : false;
        const expiresSoon = expiresAt && !expired
          ? expiresAt.getTime() - nowTick < 24 * 60 * 60 * 1000
          : false;
        const fmtDateTime = (iso: string) => new Date(iso).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        const tzAbbr = (() => {
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const parts = new Intl.DateTimeFormat([], { timeZoneName: 'short', timeZone: tz }).formatToParts(new Date());
            return parts.find(p => p.type === 'timeZoneName')?.value || tz;
          } catch { return ''; }
        })();
        // "Updated just now" diff: only show for ~60s after a successful
        // resend, and only on fields that actually changed.
        const snap =
          lastResendSnapshot &&
          lastResendSnapshot.eventId === event.id &&
          lastResendSnapshot.completedAt > 0 &&
          nowTick - lastResendSnapshot.completedAt < 60_000
            ? lastResendSnapshot
            : null;
        const tokenChanged = !!snap && snap.before.invitation_token !== invitation.invitation_token;
        const emailChanged = !!snap && snap.before.email_sent_at !== invitation.email_sent_at;
        const expiryChanged = !!snap && snap.before.expires_at !== invitation.expires_at;
        const updatedHighlight = "ring-2 ring-primary/40 transition-shadow";
        return (
          <Card className="p-5 border-primary/30 bg-primary/[0.02]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Latest Test Invitation</h3>
                  <Badge variant="outline" className="text-xs">{stageName}</Badge>
                  {snap && (tokenChanged || emailChanged || expiryChanged) && (
                    <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">
                      Updated just now
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Status of the email & link for your most recent test booking
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {(emailFailed || emailPendingStalled || expired) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resendingEventId === event.id}
                    onClick={() => handleResendInvitation(currentInterview.id, stageName, event.id, event.scheduled_at)}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${resendingEventId === event.id ? 'animate-spin' : ''}`} />
                    {resendingEventId === event.id ? 'Resending…' : 'Resend link'}
                  </Button>
                )}
                {/* Auto-resend opt-in. Only meaningful for pending/stalled
                    states, but we always show the toggle so the user can
                    arm it before a future stall. */}
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary cursor-pointer"
                    checked={autoResendEnabled}
                    onChange={(e) => {
                      setAutoResendEnabled(e.target.checked);
                      if (!e.target.checked) {
                        // Re-arm: clear the dedupe set so a future re-enable
                        // can fire again for the same event if still stalled.
                        setAutoResentEventIds(new Set());
                      }
                    }}
                  />
                  Auto-resend if pending &gt; 5 min
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Token created */}
              <div className={`rounded-md border border-border bg-background p-3 ${tokenChanged ? updatedHighlight : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  {tokenCreated ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Token</p>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {tokenCreated ? 'Created' : 'Not created'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmtDateTime(invitation.created_at)}
                </p>
              </div>

              {/* Email sent */}
              <div className={`rounded-md border border-border bg-background p-3 ${emailChanged ? updatedHighlight : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  {emailSent ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : emailFailed ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Clock className={`h-4 w-4 ${emailPendingStalled ? 'text-amber-600' : 'text-muted-foreground'}`} />
                  )}
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {emailSent ? 'Sent' : emailFailed ? 'Failed' : emailPendingStalled ? 'Pending (stalled)' : 'Pending'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invitation.email_sent_at
                    ? fmtDateTime(invitation.email_sent_at)
                    : 'Not yet delivered'}
                </p>
              </div>

              {/* Expiry */}
              <div className={`rounded-md border border-border bg-background p-3 ${expiryChanged ? updatedHighlight : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!expiresAt ? (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  ) : expired ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : expiresSoon ? (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expires</p>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {!expiresAt
                    ? 'No expiry set'
                    : expired
                      ? 'Expired'
                      : (() => {
                          // Live countdown — recomputed every second via nowTick.
                          const ms = expiresAt.getTime() - nowTick;
                          const totalSec = Math.max(0, Math.floor(ms / 1000));
                          const days = Math.floor(totalSec / 86400);
                          const hours = Math.floor((totalSec % 86400) / 3600);
                          const minutes = Math.floor((totalSec % 3600) / 60);
                          const seconds = totalSec % 60;
                          const pad = (n: number) => n.toString().padStart(2, '0');
                          if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m left`;
                          if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s left`;
                          return `${pad(minutes)}m ${pad(seconds)}s left`;
                        })()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {expiresAt
                    ? `Expires ${fmtDateTime(expiresAt.toISOString())}${tzAbbr ? ` (${tzAbbr})` : ''}`
                    : 'Link does not auto-expire'}
                </p>
              </div>
            </div>

            {/* Inline test link when available */}
            {invitation.meeting_link && emailSent && !expired && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2.5">
                <p className="text-xs text-muted-foreground truncate">
                  Direct link: <span className="font-mono text-foreground">{invitation.meeting_link}</span>
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(invitation.meeting_link!);
                    toast.success('Link copied');
                  }}
                >
                  Copy
                </Button>
              </div>
            )}
          </Card>
        );
      })()}

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

        {/* Live Indicator + Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Interview Stages</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Stage {getCurrentStageOrder(currentInterview)} of {stages.length}
              </span>
              <Badge variant="outline" className="text-xs border-green-500/50 text-green-600 bg-green-500/10 gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </Badge>
            </div>
          </div>
          <Progress 
            value={(getCurrentStageOrder(currentInterview) / stages.length) * 100} 
            className="h-2"
          />
        </div>

        {/* Pipeline Stages - Vertical Timeline */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const rawStatus = getStageStatus(stage.id, stage.name, currentInterview.events, currentInterview.current_stage_id, currentInterview);
            const event = currentInterview.events.find(e => e.stage_id === stage.id);
            const Icon = getStageIcon(stage.name);
            const isFeedbackStage = stage.name.toLowerCase().includes('feedback');
            const liveRoundJoinAction = getLiveRoundJoinAction(stage.name, currentInterview.id, stage.id);
            const slotStageName = roundSlotStageNameMap[stage.name];
            const slotStage = slotStageName ? stages.find(s => s.name === slotStageName) : null;
            const slotStageStatus = slotStage
              ? getStageStatus(slotStage.id, slotStage.name, currentInterview.events, currentInterview.current_stage_id, currentInterview)
              : null;
            const status = rawStatus === 'upcoming' && liveRoundJoinAction && slotStageStatus === 'completed'
              ? 'current'
              : rawStatus;
            const feedbackTypeMap: Record<string, string> = {
              'Demo Feedback': 'demo',
              'Segment Feedback': 'segment',
              'Admin & Academic Feedback': 'admin_academic',
              'Core Team Feedback': 'core_team',
              'Management Round Feedback': 'management',
              'HR Feedback': 'hr',
            };
            const feedbackType = feedbackTypeMap[stage.name];
            const hasSubmittedFeedback = isFeedbackStage ? hasSubmittedFeedbackForType(feedbackType) : false;
            const isFinalReview = stage.name === 'Final Review';
            const hasReviewData = status === 'completed' || status === 'passed' || (isFeedbackStage && hasSubmittedFeedback) || (isFinalReview && (status === 'current' || status === 'completed' || status === 'passed'));
            const isExpanded = expandedStageId === stage.id;
            
            return (
              <div key={stage.id} className="relative">
                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div className={`absolute left-5 top-12 w-0.5 h-[calc(100%-24px)] ${
                    status === 'completed' ? 'bg-green-500/40' : 'bg-border'
                  }`} />
                )}

                {/* Auto-processing stage indicator */}
                {status === 'current' && (stage.name === 'Interview Guidelines' || stage.name === 'CV/Resume' || stage.name === 'Resume Screening') && (
                  <div className="mb-1 flex items-center gap-2 text-xs text-blue-600 bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Processing — system will advance to the next stage automatically</span>
                  </div>
                )}

                <div className={`relative rounded-lg border-2 transition-all ${getStatusColor(status)} ${
                  hasReviewData ? 'cursor-pointer hover:shadow-md' : ''
                }`}
                  onClick={() => {
                    if (hasReviewData) {
                      setExpandedStageId(isExpanded ? null : stage.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Stage icon */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
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

                    {/* Stage info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{stage.name}</p>
                        {hasReviewData && (
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {status === 'completed' && event?.completed_at 
                            ? formatDate(event.completed_at)
                            : status === 'completed' ? 'Completed'
                            : status === 'current' && (stage.name === 'Interview Guidelines' || stage.name === 'CV/Resume' || stage.name === 'Resume Screening')
                            ? 'Auto-processing'
                            : status === 'current' ? 'Currently active'
                            : status === 'scheduled' && event?.scheduled_at 
                            ? `Scheduled for ${formatDate(event.scheduled_at)}`
                            : isFeedbackStage && hasSubmittedFeedback ? 'Feedback received'
                            : 'Upcoming'
                          }
                        </p>
                        {/* Score + threshold inline */}
                        {status === 'completed' && (() => {
                          const score = event?.ai_score || (stage.name === 'CV/Resume' || stage.name === 'Resume Screening' ? (resumeAnalysis?.overall_score || currentInterview.ai_score) : null);
                          if (score == null) return null;
                          return (
                            <>
                              <span className="text-xs font-medium text-foreground">Score: {score}%</span>
                              <Badge className={`text-[10px] px-1.5 py-0 ${
                                score >= 70 ? 'bg-green-500/10 text-green-600 border-green-500/30' : 
                                score >= 40 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' : 
                                'bg-red-500/10 text-red-600 border-red-500/30'
                              }`} variant="outline">
                                {score >= 70 ? 'Above Threshold' : score >= 40 ? 'Moderate' : 'Below Threshold'}
                              </Badge>
                            </>
                          );
                        })()}
                      </div>

                      {/* Invitation / test-link delivery status — only shown for
                          stages that have an interview_event (i.e. a scheduled
                          test/interview where an email invitation makes sense).
                          Hidden for completed stages and for feedback stages
                          which don't email the candidate. */}
                      {event && !isFeedbackStage && status !== 'completed' && (() => {
                        const invitation = invitationsByEventId[event.id];
                        const isResending = resendingEventId === event.id;
                        // Treat a stalled `pending` (>5 min old with no
                        // sent_at) as effectively failed so the candidate
                        // isn't left waiting forever for a stuck email.
                        const isStalledPending =
                          invitation?.email_status === 'pending' &&
                          !invitation.email_sent_at &&
                          (Date.now() - new Date(invitation.created_at).getTime()) > 5 * 60 * 1000;
                        const effectiveStatus: 'sent' | 'pending' | 'failed' | 'none' =
                          !invitation
                            ? 'none'
                            : invitation.email_status === 'sent'
                            ? 'sent'
                            : isStalledPending || invitation.email_status === 'failed'
                            ? 'failed'
                            : 'pending';
                        const showResend = effectiveStatus === 'failed' || effectiveStatus === 'none';
                        return (
                          <div
                            className="mt-2 flex flex-wrap items-center gap-2"
                            // Stop the parent stage card's expand-on-click handler
                            // from firing when the candidate clicks Resend.
                            onClick={(e) => e.stopPropagation()}
                          >
                            {effectiveStatus === 'sent' && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Email sent
                                {invitation?.email_sent_at && (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    {new Date(invitation.email_sent_at).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </Badge>
                            )}
                            {effectiveStatus === 'pending' && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                                <Clock className="h-3 w-3" />
                                Sending email…
                              </Badge>
                            )}
                            {effectiveStatus === 'failed' && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px] gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Email not delivered
                              </Badge>
                            )}
                            {effectiveStatus === 'none' && status === 'scheduled' && (
                              <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] gap-1">
                                <Mail className="h-3 w-3" />
                                Invitation not sent yet
                              </Badge>
                            )}
                            {showResend && (status === 'scheduled' || status === 'current') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] gap-1"
                                disabled={isResending}
                                onClick={() =>
                                  handleResendInvitation(
                                    currentInterview.id,
                                    stage.name,
                                    event.id,
                                    event.scheduled_at,
                                  )
                                }
                              >
                                <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                                {isResending ? 'Resending…' : 'Resend link'}
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Status badge + expand arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {status === 'completed' && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs" variant="outline">Done</Badge>
                      )}
                      {status === 'current' && (
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs animate-pulse" variant="outline">In Progress</Badge>
                      )}
                      {status !== 'completed' && status !== 'current' && isFeedbackStage && hasSubmittedFeedback && (
                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs" variant="outline">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Feedback Received
                        </Badge>
                      )}
                      {/* Show slot booking for all Slot Booking stages */}

                      {/* Join Meeting / Start Test for current non-slot stages */}
                      {(status === 'current' || status === 'scheduled' || (!!liveRoundJoinAction && !isFeedbackStage)) && !stage.name.toLowerCase().includes('slot booking') && (() => {
                        const sn = stage.name.toLowerCase();
                        const isWrittenTest = sn.includes('written test') || sn.includes('technical assessment');
                        const isFeedbackStage = sn.includes('feedback');
                        const isLiveRound = !isFeedbackStage && sn.includes(' round');

                        if (isWrittenTest) {
                          // Find the matching slot booking (Written Test or Technical Assessment)
                          const bookingType = sn.includes('written') ? 'written_test' : 'technical_assessment';
                          const booking = slotBookings.find(b =>
                            b.booking_type === bookingType ||
                            b.booking_type?.toLowerCase().includes(sn.includes('written') ? 'written' : 'technical')
                          );
                          // Allow Start Test once status is current, OR the booked slot time has arrived.
                          const canStart = status === 'current' || isBookingTimeReached(booking);
                          if (!canStart) return null;

                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/interview?candidateId=${currentInterview.id}&stageId=${stage.id}&type=technical`);
                              }}
                              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 font-medium"
                            >
                              <Code className="h-3 w-3" />
                              Start Test
                            </button>
                          );
                        }

                        if (isLiveRound) {
                          if (liveRoundJoinAction) {
                            return (
                              <LiveRoundRecorder
                                interviewCandidateId={currentInterview.id}
                                stageId={stage.id}
                                stageName={stage.name}
                                joinHref={liveRoundJoinAction.href}
                                joinExternal={!!liveRoundJoinAction.external}
                                onNavigateInternal={(href) => navigate(href)}
                              />
                            );
                          }

                          if (status === 'current') {
                            return (
                            <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Awaiting Link
                            </Badge>
                          );
                          }

                          return null;
                        }
                        return null;
                      })()}

                      {stage.name.toLowerCase().includes('slot booking') && (() => {
                        const isWritten = stage.name.toLowerCase().includes('written');
                        const isDemo = stage.name.toLowerCase().includes('demo');
                        const isHr = stage.name.toLowerCase().includes('hr');
                        const isSegment = stage.name.toLowerCase().includes('segment');
                        const isAdminAcademic = stage.name.toLowerCase().includes('admin') && stage.name.toLowerCase().includes('academic');
                        const isCoreTeam = stage.name.toLowerCase().includes('core team');
                        const isManagement = stage.name.toLowerCase().includes('management');
                        const bookingType = isDemo ? 'demo_round' : isHr ? 'hr_round' : isSegment ? 'segment_round' : isAdminAcademic ? 'admin_academic_round' : isCoreTeam ? 'core_team_round' : isManagement ? 'management_round' : isWritten ? 'written_test' : 'technical_assessment';
                        const stageLabel = isDemo ? 'Demo Round' : isHr ? 'HR Round' : isSegment ? 'Segment Round' : isAdminAcademic ? 'Admin & Academic Round' : isCoreTeam ? 'Core Team Round' : isManagement ? 'Management Round' : isWritten ? 'Written Test' : stage.name;
                        
                        const booking = slotBookings.find(b => 
                          b.booking_type === bookingType || b.booking_type === stageLabel
                        );
                        
                        // Allow rescheduling whenever the booking stage is not
                        // yet completed: either the candidate is on this stage
                        // (`current`) OR they already booked once and the
                        // pipeline auto-advanced (`completed`/`scheduled`) but
                        // the actual round hasn't been taken/closed yet.
                        const canReschedule =
                          status === 'current' ||
                          (!!booking && status !== 'passed');

                        // For Demo slot bookings, surface a "Start/Join Demo" action
                        // as soon as the scheduled slot time has arrived so the candidate
                        // is not blocked when status is still pending.
                        const slotTimeReached = isBookingTimeReached(booking);
                        const demoStartHref = isDemo && booking && slotTimeReached
                          ? (booking.demo_meet_link
                              ? booking.demo_meet_link
                              : booking.demo_meet_type === 'ai_video'
                                ? `/candidate/demo-round?interviewCandidateId=${currentInterview.id}&stageId=${stage.id}`
                                : null)
                          : null;
                        const demoStartIsExternal = !!booking?.demo_meet_link;

                        return (
                          <>
                            {booking && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(booking.booking_date)} • {booking.booking_time}
                              </Badge>
                            )}
                            {demoStartHref && (
                              demoStartIsExternal ? (
                                <a
                                  href={demoStartHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 font-medium"
                                >
                                  <Video className="h-3 w-3" />
                                  Join Demo
                                </a>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(demoStartHref);
                                  }}
                                  className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 font-medium"
                                >
                                  <Video className="h-3 w-3" />
                                  Start Demo
                                </button>
                              )
                            )}
                            {canReschedule && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/book-slot?candidateId=${currentInterview.id}&stageId=${stage.id}&stageName=${encodeURIComponent(stageLabel)}&type=${bookingType}`);
                                }}
                                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 font-medium"
                              >
                                <Calendar className="h-3 w-3" />
                                {booking ? 'Reschedule Slot' : 'Book Slot'}
                              </button>
                            )}
                          </>
                        );
                      })()}

                      {/* View Results button for completed stages */}
                      {hasReviewData && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedStageId(isExpanded ? null : stage.id);
                            }}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors ${
                              isExpanded 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-foreground hover:bg-muted/80'
                            }`}
                          >
                            <Eye className="h-3 w-3" />
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStageForResults({
                                stageId: stage.id,
                                stageName: stage.name,
                                interviewCandidateId: currentInterview.id,
                              });
                              setResultsModalOpen(true);
                            }}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            Detailed Results
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Results panel - shown only when expanded */}
                  {hasReviewData && isExpanded && (
                    <div className="px-3 pb-3 pt-2 ml-[52px] border-t border-border/50">
                      {getStageReviewContent(stage, event)}
                    </div>
                  )}
                </div>
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

      {/* Detailed Stage Results Modal - same as employer view */}
      {selectedStageForResults && (
        <StageResultsModal
          isOpen={resultsModalOpen}
          onClose={() => {
            setResultsModalOpen(false);
            setSelectedStageForResults(null);
          }}
          interviewCandidateId={selectedStageForResults.interviewCandidateId}
          stageId={selectedStageForResults.stageId}
          stageName={selectedStageForResults.stageName}
          candidateName="My Results"
          candidateId={candidateId}
        />
      )}
      {/* PDF Report Modal */}
      {currentInterview && (
        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Interview Review Report
              </DialogTitle>
            </DialogHeader>
            <AllStagesReviewSummary interviewCandidateId={currentInterview.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
