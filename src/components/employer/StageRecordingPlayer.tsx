import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Video, Play, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, ExternalLink, Link, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InterviewResponse {
  id: string;
  questions: any[];
  answers: number[];
  score: number | null;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number | null;
  recording_url: string | null;
  demo_video_url: string | null;
  completed_at: string | null;
  interview_event_id: string;
}

interface InterviewInvitation {
  id: string;
  invitation_token: string;
  expires_at: string;
  email_status: string;
}

interface StageRecordingPlayerProps {
  interviewCandidateId: string;
  stageId: string;
  stageName: string;
  showLinkForPending?: boolean;
}

export const StageRecordingPlayer = ({ 
  interviewCandidateId, 
  stageId,
  stageName,
  showLinkForPending = false
}: StageRecordingPlayerProps) => {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<InterviewResponse | null>(null);
  const [invitation, setInvitation] = useState<InterviewInvitation | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get interview event for this stage
        const { data: event, error: eventError } = await supabase
          .from('interview_events')
          .select('id, status')
          .eq('interview_candidate_id', interviewCandidateId)
          .eq('stage_id', stageId)
          .single();

        if (eventError || !event) {
          setLoading(false);
          return;
        }

        // Get invitation for this event (to show interview link)
        const { data: invitationData } = await supabase
          .from('interview_invitations')
          .select('id, invitation_token, expires_at, email_status')
          .eq('interview_event_id', event.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (invitationData) {
          setInvitation(invitationData as InterviewInvitation);
        }

        // Get response for this event (completed interview)
        const { data: responseData, error: responseError } = await supabase
          .from('interview_responses')
          .select('*')
          .eq('interview_event_id', event.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        if (!responseError && responseData) {
          setResponse(responseData as InterviewResponse);
        }
      } catch (err) {
        console.error('Error fetching stage recording:', err);
      } finally {
        setLoading(false);
      }
    };

    if (interviewCandidateId && stageId) {
      fetchData();
    }
  }, [interviewCandidateId, stageId]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getInterviewLink = () => {
    if (!invitation?.invitation_token) return null;
    return `${window.location.origin}/interview?token=${invitation.invitation_token}`;
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = getInterviewLink();
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Interview link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Loading results...</span>
      </div>
    );
  }

  // Show interview link if we have invitation but no completed response
  const interviewLink = getInterviewLink();
  const isExpired = invitation?.expires_at ? new Date(invitation.expires_at) < new Date() : false;

  if (!response && invitation && interviewLink) {
    return (
      <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Link className="h-3 w-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-800">Interview Link</span>
          {isExpired && (
            <Badge variant="destructive" className="text-xs h-4 px-1">Expired</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={interviewLink}
            readOnly
            className="flex-1 text-xs bg-white border rounded px-2 py-1 text-muted-foreground truncate"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs shrink-0"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Share this link with the candidate to take the interview
        </p>
      </div>
    );
  }

  if (!response) {
    return null;
  }

  // Get the video URL (demo video or regular recording)
  const videoUrl = response.demo_video_url || response.recording_url;
  const isDemoVideo = !!response.demo_video_url;
  const hasMCQResults = response.total_questions > 0 && response.questions?.length > 0;

  const scorePercentage = response.score || 0;
  const scoreColor = scorePercentage >= 60 ? 'text-green-600' : scorePercentage >= 40 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = scorePercentage >= 60 ? 'bg-green-50' : scorePercentage >= 40 ? 'bg-yellow-50' : 'bg-red-50';

  return (
    <div className="mt-2 space-y-2">
      {/* Score Summary Row - Only show for MCQ interviews */}
      {hasMCQResults && (
        <div className={`flex items-center gap-3 p-2 rounded-lg ${scoreBg} border`}>
          <div className={`font-bold ${scoreColor}`}>
            {scorePercentage}%
          </div>
          <div className="text-xs text-muted-foreground">
            {response.correct_answers}/{response.total_questions} correct
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(response.time_taken_seconds)}
          </div>
          {videoUrl && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                setShowVideo(!showVideo);
              }}
            >
              <Video className="h-3 w-3 mr-1" />
              {showVideo ? 'Hide' : 'View'} Recording
              {showVideo ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>
      )}

      {/* Demo Video Card - Show for video submission stages */}
      {isDemoVideo && !hasMCQResults && (
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Demo Video Submitted</span>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">
                For Review
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-purple-700 hover:bg-purple-100"
              onClick={(e) => {
                e.stopPropagation();
                setShowVideo(!showVideo);
              }}
            >
              <Play className="h-3 w-3 mr-1" />
              {showVideo ? 'Hide' : 'Watch'} Video
              {showVideo ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          </div>
          {response.completed_at && (
            <p className="text-xs text-purple-600">
              Submitted: {new Date(response.completed_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
          )}
        </div>
      )}

      {/* Video Player */}
      {showVideo && videoUrl && (
        <div className="space-y-2 border rounded-lg p-2 bg-background">
          <video 
            src={videoUrl} 
            controls 
            className="w-full rounded-lg bg-black aspect-video max-h-48"
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                window.open(videoUrl, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Full Screen
            </Button>
            {hasMCQResults && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
              >
                {showDetails ? 'Hide' : 'Show'} Answers
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Question Details - Only show for MCQ interviews */}
      {showDetails && hasMCQResults && response.questions && (
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-background">
          {response.questions.map((q: any, idx: number) => {
            const userAnswer = response.answers?.[idx];
            const isCorrect = userAnswer === q.correctAnswer;
            
            return (
              <div 
                key={idx} 
                className={`p-2 rounded-lg text-xs ${
                  isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-2">
                      Q{idx + 1}: {q.question}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {isCorrect ? 'Correct' : `Wrong (Selected: ${String.fromCharCode(65 + userAnswer)}, Correct: ${String.fromCharCode(65 + q.correctAnswer)})`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
