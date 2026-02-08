import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, Clock, Loader2, Mail, User, Video, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FeedbackReview {
  id: string;
  reviewer_email: string | null;
  reviewer_name: string | null;
  status: string | null;
  overall_rating: number | null;
  teaching_skills_rating: number | null;
  communication_rating: number | null;
  subject_knowledge_rating: number | null;
  recommendation: string | null;
  feedback_text: string | null;
  submitted_at: string | null;
}

export const DemoFeedbackResults = ({ interviewCandidateId }: { interviewCandidateId: string }) => {
  const [reviews, setReviews] = useState<FeedbackReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [demoRecordingUrl, setDemoRecordingUrl] = useState<string | null>(null);
  const [showRecording, setShowRecording] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch reviews and demo recording in parallel
        const [reviewsResult, recordingResult] = await Promise.all([
          supabase
            .from('management_reviews')
            .select('id, reviewer_email, reviewer_name, status, overall_rating, teaching_skills_rating, communication_rating, subject_knowledge_rating, recommendation, feedback_text, submitted_at')
            .eq('interview_candidate_id', interviewCandidateId)
            .order('created_at', { ascending: true }),
          // Get demo recording from interview_responses (demo_video_url or recording_url)
          supabase
            .from('interview_events')
            .select(`
              id,
              stage:interview_stages!interview_events_stage_id_fkey(name, stage_order),
              interview_responses(recording_url, demo_video_url)
            `)
            .eq('interview_candidate_id', interviewCandidateId)
            .eq('status', 'completed')
        ]);

        if (reviewsResult.error) {
          console.error('Error fetching reviews:', reviewsResult.error);
        } else {
          setReviews(reviewsResult.data || []);
        }

        // Find demo round recording
        if (!recordingResult.error && recordingResult.data) {
          const demoEvent = recordingResult.data.find((e: any) => {
            const stageName = e.stage?.name?.toLowerCase() || '';
            return stageName.includes('demo');
          });
          if (demoEvent) {
            const responses = demoEvent.interview_responses as any[];
            if (responses && responses.length > 0) {
              const url = responses[0].demo_video_url || responses[0].recording_url;
              if (url) setDemoRecordingUrl(url);
            }
          }
        }

        // Also check mock_interview_stage_results for AI video demo recordings
        if (!demoRecordingUrl) {
          // Get candidate_id from interview_candidates
          const { data: icData } = await supabase
            .from('interview_candidates')
            .select('candidate_id')
            .eq('id', interviewCandidateId)
            .single();

          if (icData?.candidate_id) {
            const { data: mockSessions } = await supabase
              .from('mock_interview_sessions')
              .select('id')
              .eq('candidate_id', icData.candidate_id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (mockSessions && mockSessions.length > 0) {
              const { data: stageResults } = await supabase
                .from('mock_interview_stage_results')
                .select('recording_url, stage_name')
                .eq('session_id', mockSessions[0].id)
                .ilike('stage_name', '%demo%')
                .not('recording_url', 'is', null)
                .order('completed_at', { ascending: false })
                .limit(1);

              if (stageResults && stageResults.length > 0 && stageResults[0].recording_url) {
                setDemoRecordingUrl(stageResults[0].recording_url);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [interviewCandidateId]);

  const handleResendFeedback = async () => {
    setIsResending(true);
    try {
      await supabase.functions.invoke('send-demo-feedback-email', {
        body: { interviewCandidateId }
      });
      toast.success('Feedback request resent to observers');
    } catch (err) {
      console.error('Error resending:', err);
      toast.error('Failed to resend feedback request');
    } finally {
      setIsResending(false);
    }
  };

  const getRecommendationLabel = (rec: string | null) => {
    switch (rec) {
      case 'strongly_recommend': return { label: 'Strongly Recommend', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'recommend': return { label: 'Recommend', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'consider': return { label: 'Consider', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'not_recommend': return { label: 'Not Recommended', color: 'bg-red-100 text-red-700 border-red-200' };
      default: return { label: rec || 'N/A', color: 'bg-muted text-muted-foreground' };
    }
  };

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading feedback...
      </div>
    );
  }

  if (reviews.length === 0 && !demoRecordingUrl) {
    return (
      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-amber-700">
          <Clock className="h-3 w-3" />
          <span className="font-medium">No feedback requests sent yet</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] px-2 border-amber-400 text-amber-700 hover:bg-amber-100"
          onClick={handleResendFeedback}
          disabled={isResending}
        >
          {isResending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
          Send Feedback Request
        </Button>
      </div>
    );
  }

  const submittedCount = reviews.filter(r => r.status === 'submitted').length;
  const pendingCount = reviews.length - submittedCount;

  return (
    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Demo Recording Section */}
      {demoRecordingUrl && (
        <div className="bg-pink-50 border border-pink-200 rounded p-1.5 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] font-medium text-pink-700">
              <Video className="h-3 w-3" />
              Demo Recording
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 text-[9px] px-1.5 text-pink-600 hover:text-pink-700 hover:bg-pink-100"
              onClick={() => setShowRecording(!showRecording)}
            >
              <Play className="h-2.5 w-2.5 mr-0.5" />
              {showRecording ? 'Hide' : 'Watch'}
            </Button>
          </div>
          {showRecording && (
            <video
              src={demoRecordingUrl}
              controls
              className="w-full rounded bg-black aspect-video max-h-40"
              preload="metadata"
            />
          )}
        </div>
      )}

      {/* Feedback Header */}
      {reviews.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <Star className="h-3 w-3" />
              Observer Feedback ({submittedCount}/{reviews.length})
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 text-[9px] px-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
              onClick={handleResendFeedback}
              disabled={isResending}
            >
              {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3 mr-0.5" />}
              Resend
            </Button>
          </div>

          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded border border-amber-100 p-1.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px]">
                  <User className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="font-medium truncate max-w-[120px]">{review.reviewer_name || review.reviewer_email}</span>
                </div>
                {review.status === 'submitted' ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[8px] py-0 px-1">
                    <CheckCircle2 className="h-2 w-2 mr-0.5" />
                    Submitted
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[8px] py-0 px-1">
                    <Clock className="h-2 w-2 mr-0.5" />
                    Pending
                  </Badge>
                )}
              </div>

              {review.status === 'submitted' && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-2.5 w-2.5 ${
                            star <= (review.overall_rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{review.overall_rating}/5</span>
                    {review.recommendation && (
                      <Badge className={`text-[8px] py-0 px-1 ${getRecommendationLabel(review.recommendation).color}`}>
                        {getRecommendationLabel(review.recommendation).label}
                      </Badge>
                    )}
                  </div>
                  {review.feedback_text && (
                    <p className="text-[9px] text-muted-foreground line-clamp-2 italic">"{review.feedback_text}"</p>
                  )}
                </>
              )}
            </div>
          ))}

          {pendingCount > 0 && (
            <p className="text-[9px] text-amber-600">
              ⏳ Waiting for {pendingCount} observer{pendingCount > 1 ? 's' : ''} to submit feedback
            </p>
          )}
        </>
      )}

      {/* Show send feedback button if only recording exists but no reviews */}
      {reviews.length === 0 && demoRecordingUrl && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-6 text-[10px] px-2 border-amber-400 text-amber-700 hover:bg-amber-100"
          onClick={handleResendFeedback}
          disabled={isResending}
        >
          {isResending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
          Send Feedback Request to Observers
        </Button>
      )}
    </div>
  );
};
