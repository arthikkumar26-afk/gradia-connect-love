import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Video, Play, CheckCircle, XCircle, Clock, BarChart3, ExternalLink } from "lucide-react";

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
}

interface InterviewRecordingPlayerProps {
  interviewCandidateId: string;
}

export const InterviewRecordingPlayer = ({ interviewCandidateId }: InterviewRecordingPlayerProps) => {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<InterviewResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        // Get interview events for this candidate
        const { data: events, error: eventsError } = await supabase
          .from('interview_events')
          .select('id')
          .eq('interview_candidate_id', interviewCandidateId);

        if (eventsError || !events?.length) {
          setLoading(false);
          return;
        }

        const eventIds = events.map(e => e.id);

        // Get responses for these events
        const { data: responsesData, error: responsesError } = await supabase
          .from('interview_responses')
          .select('*')
          .in('interview_event_id', eventIds)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        if (!responsesError && responsesData) {
          setResponses(responsesData as InterviewResponse[]);
          if (responsesData.length > 0) {
            setSelectedResponse(responsesData[0] as InterviewResponse);
          }
        }
      } catch (err) {
        console.error('Error fetching interview responses:', err);
      } finally {
        setLoading(false);
      }
    };

    if (interviewCandidateId) {
      fetchResponses();
    }
  }, [interviewCandidateId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading interview data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (responses.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Video className="h-4 w-4" />
            <span className="text-sm">No interview recordings available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          Interview Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedResponse && (
          <>
            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className={`text-2xl font-bold ${
                  (selectedResponse.score || 0) >= 60 ? 'text-green-600' : 
                  (selectedResponse.score || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {selectedResponse.score || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-foreground">
                  {selectedResponse.correct_answers}/{selectedResponse.total_questions}
                </div>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-lg font-bold text-foreground">
                  {formatTime(selectedResponse.time_taken_seconds)}
                </div>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
            </div>

            {/* Recording Player */}
            {selectedResponse.recording_url && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Screen Recording
                </p>
                <video 
                  src={selectedResponse.recording_url} 
                  controls 
                  className="w-full rounded-lg bg-black aspect-video"
                  preload="metadata"
                >
                  Your browser does not support video playback.
                </video>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => window.open(selectedResponse.recording_url!, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            )}

            {/* Toggle Q&A Details */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => setShowDetails(!showDetails)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide' : 'View'} Question Details
            </Button>

            {/* Question Details */}
            {showDetails && selectedResponse.questions && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {selectedResponse.questions.map((q: any, idx: number) => {
                  const userAnswer = selectedResponse.answers?.[idx];
                  const isCorrect = userAnswer === q.correctAnswer;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${
                        isCorrect ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Q{idx + 1}: {q.question}
                          </p>
                          <div className="mt-2 space-y-1">
                            {q.options?.map((opt: string, optIdx: number) => (
                              <div 
                                key={optIdx}
                                className={`text-xs p-1.5 rounded ${
                                  optIdx === q.correctAnswer 
                                    ? 'bg-green-100 text-green-800 font-medium' 
                                    : optIdx === userAnswer && !isCorrect
                                      ? 'bg-red-100 text-red-800'
                                      : 'text-muted-foreground'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}. {opt}
                                {optIdx === q.correctAnswer && ' ✓'}
                                {optIdx === userAnswer && optIdx !== q.correctAnswer && ' (Selected)'}
                              </div>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed timestamp */}
            {selectedResponse.completed_at && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Completed {new Date(selectedResponse.completed_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            )}
          </>
        )}

        {/* Multiple responses selector */}
        {responses.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {responses.map((resp, idx) => (
              <Badge
                key={resp.id}
                variant={selectedResponse?.id === resp.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedResponse(resp)}
              >
                Interview {idx + 1}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
