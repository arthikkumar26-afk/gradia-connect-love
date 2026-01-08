import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Video, Play, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface InterviewResponse {
  id: string;
  questions: any[];
  answers: number[];
  score: number | null;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number | null;
  recording_url: string | null;
  completed_at: string | null;
  interview_event_id: string;
}

interface StageRecordingPlayerProps {
  interviewCandidateId: string;
  stageId: string;
  stageName: string;
}

export const StageRecordingPlayer = ({ 
  interviewCandidateId, 
  stageId,
  stageName 
}: StageRecordingPlayerProps) => {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<InterviewResponse | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchResponse = async () => {
      try {
        // Get interview event for this stage
        const { data: event, error: eventError } = await supabase
          .from('interview_events')
          .select('id')
          .eq('interview_candidate_id', interviewCandidateId)
          .eq('stage_id', stageId)
          .single();

        if (eventError || !event) {
          setLoading(false);
          return;
        }

        // Get response for this event
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
      fetchResponse();
    }
  }, [interviewCandidateId, stageId]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Loading results...</span>
      </div>
    );
  }

  if (!response) {
    return null;
  }

  const scorePercentage = response.score || 0;
  const scoreColor = scorePercentage >= 60 ? 'text-green-600' : scorePercentage >= 40 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = scorePercentage >= 60 ? 'bg-green-50' : scorePercentage >= 40 ? 'bg-yellow-50' : 'bg-red-50';

  return (
    <div className="mt-2 space-y-2">
      {/* Score Summary Row */}
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
        {response.recording_url && (
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

      {/* Video Player */}
      {showVideo && response.recording_url && (
        <div className="space-y-2 border rounded-lg p-2 bg-background">
          <video 
            src={response.recording_url} 
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
                window.open(response.recording_url!, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Full Screen
            </Button>
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
          </div>
        </div>
      )}

      {/* Question Details */}
      {showDetails && response.questions && (
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
