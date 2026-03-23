import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { StageResultsModal } from "@/components/employer/StageResultsModal";

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
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewCandidate[]>([]);
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slotBookings, setSlotBookings] = useState<SlotBooking[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [reviews, setReviews] = useState<ManagementReview[]>([]);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedStageForResults, setSelectedStageForResults] = useState<{ stageId: string; stageName: string; interviewCandidateId: string } | null>(null);

  useEffect(() => {
    fetchData();

    // Realtime: listen for current_stage_id / status changes on interview_candidates
    const candidateChannel = supabase
      .channel(`pipeline-candidate-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_candidates',
          filter: `candidate_id=eq.${candidateId}`,
        },
        () => {
          console.log('Realtime: interview_candidates updated');
          fetchData();
        }
      )
      .subscribe();

    // Realtime: listen for new / updated interview_events
    const eventsChannel = supabase
      .channel(`pipeline-events-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_events',
        },
        () => {
          console.log('Realtime: interview_events updated');
          fetchData();
        }
      )
      .subscribe();

    // Realtime: listen for management_reviews (feedback submissions)
    const reviewsChannel = supabase
      .channel(`pipeline-reviews-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'management_reviews',
        },
        () => {
          console.log('Realtime: management_reviews updated');
          fetchData();
        }
      )
      .subscribe();

    // Realtime: listen for slot_bookings changes
    const bookingsChannel = supabase
      .channel(`pipeline-bookings-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_bookings',
          filter: `candidate_id=eq.${candidateId}`,
        },
        () => {
          console.log('Realtime: slot_bookings updated');
          fetchData();
        }
      )
      .subscribe();

    // Also poll every 30 seconds as fallback for realtime issues
    const pollInterval = setInterval(() => {
      fetchData();
    }, 30000);

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
        
        // Fetch responses and reviews for the first interview
        await fetchReviewData(interviewsWithEvents[0]);
      }

      // Fetch slot bookings for this candidate
      const { data: bookingsData } = await supabase
        .from('slot_bookings')
        .select('id, booking_date, booking_time, booking_type, status, demo_meet_link, demo_meet_type')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      setSlotBookings(bookingsData || []);
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
          .select('id, interview_event_id, score, total_questions, correct_answers, time_taken_seconds, completed_at')
          .in('interview_event_id', eventIds);
        setResponses(responsesData || []);
      }

      // Fetch management reviews (demo feedback)
      const { data: reviewsData } = await supabase
        .from('management_reviews')
        .select('id, interview_candidate_id, reviewer_name, overall_rating, feedback_text, recommendation, strengths, areas_for_improvement, teaching_skills_rating, communication_rating, subject_knowledge_rating, status, submitted_at')
        .eq('interview_candidate_id', interview.id)
        .eq('status', 'submitted');
      setReviews(reviewsData || []);
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
        return MessageSquare;
      case 'HR Round Slot Booking':
        return Calendar;
      case 'HR Round':
        return UserCheck;
      case 'Final Review':
        return FileCheck;
      case 'Offer Stage':
        return Gift;
      default:
        return CheckCircle2;
    }
  };

  const getStageStatus = (stageId: string, events: InterviewEvent[], currentStageId: string | null) => {
    // Check for completed or passed events first
    const completedEvent = events.find(e => e.stage_id === stageId && (e.status === 'completed' || e.status === 'passed'));
    if (completedEvent) return 'completed';

    const stage = stages.find(s => s.id === stageId);
    const currentStage = stages.find(s => s.id === currentStageId);

    // If current_stage_id has advanced past this stage, it's completed regardless of event status
    // This handles cases where a 'scheduled' event exists but the test was actually completed
    if (stage && currentStage && stage.stage_order < currentStage.stage_order) {
      return 'completed';
    }

    // Check for any event for this stage
    const event = events.find(e => e.stage_id === stageId);
    if (event) {
      // If stage_order matches current, treat as current (in-progress)
      if (stage && currentStage && stage.stage_order === currentStage.stage_order) {
        return 'current';
      }
      return event.status;
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

    const status = getStageStatus(stage.id, currentInterview.events, currentInterview.current_stage_id);
    if (status !== 'completed' && status !== 'passed') return null;

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
        // Get analysis from multiple sources: event ai_feedback > interview ai_analysis
        const eventFeedback = event?.ai_feedback && typeof event.ai_feedback === 'object' ? event.ai_feedback as any : null;
        const analysis = eventFeedback?.overall_score ? eventFeedback : currentInterview.ai_analysis;
        const score = event?.ai_score || currentInterview.ai_score;
        
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
            {analysis?.summary && (
              <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            )}
            {analysis?.strengths && analysis.strengths.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Strengths:</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.strengths.slice(0, 5).map((s: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <ThumbsUp className="h-3 w-3 mr-1 text-green-500" />
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
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
          </div>
        );
      }

      case 'Demo Round': {
        const score = event?.ai_score;
        return (
          <div className="space-y-3">
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

      case 'Demo Feedback': {
        const submittedReviews = reviews.filter(r => r.status === 'submitted');
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

      case 'HR Round': {
        const score = event?.ai_score;
        return (
          <div className="space-y-3">
            {score != null && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">HR Score:</span>
                <Badge className={`${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                  {score}%
                </Badge>
              </div>
            )}
            {event?.notes && (
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            )}
            {!score && !event?.notes && (
              <p className="text-sm text-muted-foreground">HR Round completed successfully.</p>
            )}
          </div>
        );
      }

      case 'Final Review': {
        const score = event?.ai_score;
        return (
          <div className="space-y-3">
            {score != null && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Final Score:</span>
                <Badge className={`${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                  {score}%
                </Badge>
              </div>
            )}
            {event?.ai_feedback && typeof event.ai_feedback === 'object' && event.ai_feedback.overall_summary && (
              <p className="text-sm text-muted-foreground">{event.ai_feedback.overall_summary}</p>
            )}
            {event?.notes && (
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            )}
            {!score && !event?.notes && (
              <p className="text-sm text-muted-foreground">Final review completed.</p>
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
          const bookingType = isDemo ? 'demo_round' : isHr ? 'hr_round' : isWritten ? 'written_test' : 'technical_assessment';
          const stageLabel = isDemo ? 'Demo Round' : isHr ? 'HR Round' : isWritten ? 'Written Test' : stage.name;
          
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

        {/* Live Indicator + Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Interview Stages</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Stage {getCurrentStageOrder(currentInterview.current_stage_id)} of {stages.length}
              </span>
              <Badge variant="outline" className="text-xs border-green-500/50 text-green-600 bg-green-500/10 gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </Badge>
            </div>
          </div>
          <Progress 
            value={(getCurrentStageOrder(currentInterview.current_stage_id) / stages.length) * 100} 
            className="h-2"
          />
        </div>

        {/* Pipeline Stages - Vertical Timeline */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.id, currentInterview.events, currentInterview.current_stage_id);
            const event = currentInterview.events.find(e => e.stage_id === stage.id);
            const Icon = getStageIcon(stage.name);
            const hasReviewData = status === 'completed' || status === 'passed';
            const isExpanded = expandedStageId === stage.id;
            
            return (
              <div key={stage.id} className="relative">
                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div className={`absolute left-5 top-12 w-0.5 h-[calc(100%-24px)] ${
                    status === 'completed' ? 'bg-green-500/40' : 'bg-border'
                  }`} />
                )}

                {/* Email-only current stage: show "Email Sent" banner above */}
                {status === 'current' && (stage.name === 'Interview Guidelines' || stage.name === 'CV/Resume' || stage.name === 'Resume Screening') && (
                  <div className="mb-1 flex items-center gap-2 text-xs text-green-600 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-1.5">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Email sent — awaiting system to advance to the next stage</span>
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
                            ? 'Email sent to candidate'
                            : status === 'current' ? 'Currently active'
                            : status === 'scheduled' && event?.scheduled_at 
                            ? `Scheduled for ${formatDate(event.scheduled_at)}`
                            : 'Upcoming'
                          }
                        </p>
                        {/* Score + threshold inline */}
                        {status === 'completed' && (() => {
                          const score = event?.ai_score || (stage.name === 'CV/Resume' ? currentInterview.ai_score : null);
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
                    </div>

                    {/* Status badge + expand arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {status === 'completed' && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs" variant="outline">Done</Badge>
                      )}
                      {status === 'current' && (
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs animate-pulse" variant="outline">In Progress</Badge>
                      )}
                      {/* Show slot booking for all Slot Booking stages */}

                      {stage.name.toLowerCase().includes('slot booking') && (() => {
                        const isWritten = stage.name.toLowerCase().includes('written');
                        const isDemo = stage.name.toLowerCase().includes('demo');
                        const isHr = stage.name.toLowerCase().includes('hr');
                        const bookingType = isDemo ? 'demo_round' : isHr ? 'hr_round' : isWritten ? 'written_test' : 'technical_assessment';
                        const stageLabel = isDemo ? 'Demo Round' : isHr ? 'HR Round' : isWritten ? 'Written Test' : stage.name;
                        
                        const booking = slotBookings.find(b => 
                          b.booking_type === bookingType || b.booking_type === stageLabel
                        );
                        
                        return (
                          <>
                            {booking && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(booking.booking_date)} • {booking.booking_time}
                              </Badge>
                            )}
                            {status === 'current' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/book-slot?candidateId=${currentInterview.id}&stageId=${stage.id}&stageName=${encodeURIComponent(stageLabel)}&type=${bookingType}`);
                                }}
                                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 font-medium"
                              >
                                <Calendar className="h-3 w-3" />
                                {booking ? 'Rebook Slot' : 'Book Slot'}
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
        />
      )}
    </div>
  );
};
