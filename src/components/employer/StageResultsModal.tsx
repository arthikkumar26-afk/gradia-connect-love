import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  Video, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  FileText,
  Award,
  AlertCircle
} from "lucide-react";

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

interface StageResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewCandidateId: string;
  stageId: string;
  stageName: string;
  candidateName: string;
}

export const StageResultsModal = ({
  isOpen,
  onClose,
  interviewCandidateId,
  stageId,
  stageName,
  candidateName
}: StageResultsModalProps) => {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<InterviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !interviewCandidateId || !stageId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get interview event for this stage
        const { data: event, error: eventError } = await supabase
          .from('interview_events')
          .select('id, status, completed_at, ai_score, ai_feedback')
          .eq('interview_candidate_id', interviewCandidateId)
          .eq('stage_id', stageId)
          .single();

        if (eventError || !event) {
          setError("No interview event found for this stage");
          setLoading(false);
          return;
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

        if (responseError || !responseData) {
          setError("No completed interview response found");
          setLoading(false);
          return;
        }

        setResponse(responseData as InterviewResponse);
      } catch (err) {
        console.error('Error fetching stage results:', err);
        setError("Failed to load interview results");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, interviewCandidateId, stageId]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const videoUrl = response?.demo_video_url || response?.recording_url;
  const hasMCQResults = response && response.total_questions > 0 && response.questions?.length > 0;
  const scorePercentage = response?.score || 0;
  const isPassed = scorePercentage >= 50;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <span className="text-lg">{stageName} Results</span>
              <p className="text-sm font-normal text-muted-foreground mt-1">
                Candidate: {candidateName}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading interview results...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{error}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  The candidate may not have completed this stage yet.
                </p>
              </div>
            ) : response ? (
              <>
                {/* Score Summary Card */}
                <div className={`rounded-xl p-6 border-2 ${
                  isPassed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                        isPassed ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <Award className={`h-8 w-8 ${isPassed ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <div className={`text-4xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                          {scorePercentage}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={`text-sm px-3 py-1 ${
                        isPassed 
                          ? 'bg-green-100 text-green-700 border-green-300' 
                          : 'bg-red-100 text-red-700 border-red-300'
                      }`}>
                        {isPassed ? 'Passed' : 'Below Threshold'}
                      </Badge>
                      {hasMCQResults && (
                        <p className="text-sm text-muted-foreground">
                          {response.correct_answers}/{response.total_questions} correct answers
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                        <Clock className="h-4 w-4" />
                        Time: {formatTime(response.time_taken_seconds)}
                      </div>
                    </div>
                  </div>
                  {response.completed_at && (
                    <p className="text-xs text-muted-foreground mt-4 border-t pt-4">
                      Completed: {new Date(response.completed_at).toLocaleString('en-IN', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                    </p>
                  )}
                </div>

                {/* Video Recording Section */}
                {videoUrl && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        Interview Recording
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(videoUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Full Screen
                      </Button>
                    </div>
                    <div className="rounded-lg overflow-hidden bg-black">
                      <video 
                        src={videoUrl} 
                        controls 
                        className="w-full aspect-video"
                        preload="metadata"
                      >
                        Your browser does not support video playback.
                      </video>
                    </div>
                  </div>
                )}

                {/* Questions & Answers Section */}
                {hasMCQResults && response.questions && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Questions & Answers ({response.questions.length} questions)
                    </h3>
                    <div className="space-y-3">
                      {response.questions.map((q: any, idx: number) => {
                        const userAnswer = response.answers?.[idx];
                        const isCorrect = userAnswer === q.correctAnswer;
                        
                        return (
                          <div 
                            key={idx} 
                            className={`p-4 rounded-lg border-2 ${
                              isCorrect 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 p-1 rounded-full ${
                                isCorrect ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                {isCorrect ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    Question {idx + 1}
                                  </Badge>
                                  <Badge className={`text-xs ${
                                    isCorrect 
                                      ? 'bg-green-100 text-green-700 border-green-300' 
                                      : 'bg-red-100 text-red-700 border-red-300'
                                  }`}>
                                    {isCorrect ? 'Correct' : 'Incorrect'}
                                  </Badge>
                                </div>
                                <p className="font-medium text-foreground mb-3">
                                  {q.question}
                                </p>
                                
                                {/* Options */}
                                {q.options && (
                                  <div className="space-y-2 ml-2">
                                    {q.options.map((option: string, optIdx: number) => {
                                      const isSelected = userAnswer === optIdx;
                                      const isCorrectOption = q.correctAnswer === optIdx;
                                      
                                      return (
                                        <div 
                                          key={optIdx}
                                          className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                                            isCorrectOption 
                                              ? 'bg-green-100 border border-green-300' 
                                              : isSelected && !isCorrectOption
                                                ? 'bg-red-100 border border-red-300'
                                                : 'bg-background border border-border'
                                          }`}
                                        >
                                          <span className="font-medium w-6">
                                            {String.fromCharCode(65 + optIdx)}.
                                          </span>
                                          <span className="flex-1">{option}</span>
                                          {isCorrectOption && (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                          )}
                                          {isSelected && !isCorrectOption && (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {!isCorrect && (
                                  <p className="text-sm text-muted-foreground mt-3">
                                    <span className="font-medium">Your answer:</span>{' '}
                                    {String.fromCharCode(65 + userAnswer)} |{' '}
                                    <span className="font-medium text-green-600">Correct answer:</span>{' '}
                                    {String.fromCharCode(65 + q.correctAnswer)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No MCQ but has video - show message */}
                {!hasMCQResults && videoUrl && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>This stage had a video submission without MCQ questions.</p>
                  </div>
                )}

                {/* No content at all */}
                {!hasMCQResults && !videoUrl && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No detailed results available for this stage.</p>
                    <p className="text-sm mt-2">The stage may have been manually advanced.</p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
