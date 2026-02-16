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
  AlertCircle,
  Brain,
  Sparkles
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

interface EventData {
  id: string;
  status: string;
  completed_at: string | null;
  ai_score: number | null;
  ai_feedback: any;
  notes: string | null;
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
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !interviewCandidateId || !stageId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get interview event for this stage - prefer completed events with actual AI scores
        // First try to find a completed event that has a real AI score (not 0/null from manual advance)
        let { data: event, error: eventError } = await supabase
          .from('interview_events')
          .select('id, status, completed_at, ai_score, ai_feedback, notes')
          .eq('interview_candidate_id', interviewCandidateId)
          .eq('stage_id', stageId)
          .in('status', ['completed', 'passed'])
          .not('completed_at', 'is', null)
          .not('ai_score', 'is', null)
          .gt('ai_score', 0)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Fallback: get any completed event for this stage (including ones with 0 score)
        if (!event) {
          const { data: completedEvent } = await supabase
            .from('interview_events')
            .select('id, status, completed_at, ai_score, ai_feedback, notes')
            .eq('interview_candidate_id', interviewCandidateId)
            .eq('stage_id', stageId)
            .in('status', ['completed', 'passed'])
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          event = completedEvent;
        }

        // Final fallback: get any event for this stage
        if (!event) {
          const { data: fallbackEvent } = await supabase
            .from('interview_events')
            .select('id, status, completed_at, ai_score, ai_feedback, notes')
            .eq('interview_candidate_id', interviewCandidateId)
            .eq('stage_id', stageId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          event = fallbackEvent;
        }

        // For CV/Resume stage: if event has no AI analysis, fallback to interview_candidates data
        if (event && stageName === 'CV/Resume' && (!event.ai_score || event.ai_score === 0) && !event.ai_feedback) {
          const { data: candidateData } = await supabase
            .from('interview_candidates')
            .select('ai_score, ai_analysis')
            .eq('id', interviewCandidateId)
            .single();

          if (candidateData && (candidateData.ai_score || candidateData.ai_analysis)) {
            // Override the event data with the candidate's actual analysis
            event = {
              ...event,
              ai_score: candidateData.ai_score || event.ai_score,
              ai_feedback: candidateData.ai_analysis || event.ai_feedback,
            };
          }
        }

        if (!event) {
          setError("No interview event found for this stage");
          setLoading(false);
          return;
        }

        setEventData(event as EventData);

        // Try to get response for this event (completed interview with MCQ/video)
        const { data: responseData } = await supabase
          .from('interview_responses')
          .select('*')
          .eq('interview_event_id', event.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (responseData) {
          setResponse(responseData as InterviewResponse);
        }
        // If no response, we still have eventData with AI feedback to show
      } catch (err) {
        console.error('Error fetching stage results:', err);
        setError("Failed to load interview results");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, interviewCandidateId, stageId, stageName]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const videoUrl = response?.demo_video_url || response?.recording_url;
  const hasMCQResults = response && response.total_questions > 0 && response.questions?.length > 0;
  
  // Use response score if available, otherwise use event AI score
  const scorePercentage = response?.score || eventData?.ai_score || 0;
  const isPassed = scorePercentage >= 50;
  const hasEventData = eventData && (eventData.ai_score !== null || eventData.ai_feedback || eventData.notes);

  // Parse AI feedback from event - handle both CV/Resume analysis format and generic AI feedback
  const aiFeedback = eventData?.ai_feedback;
  const isCVAnalysis = aiFeedback && (aiFeedback?.skill_match_score !== undefined || aiFeedback?.recommendation !== undefined || aiFeedback?.overall_score !== undefined);
  
  const feedbackText = typeof aiFeedback === 'string' 
    ? aiFeedback 
    : isCVAnalysis 
      ? aiFeedback?.summary 
      : aiFeedback?.feedback || aiFeedback?.next_stage_recommendations || null;
  const keyObservations = isCVAnalysis ? (aiFeedback?.strengths || []) : (aiFeedback?.key_observations || []);
  const areasOfConcern = isCVAnalysis ? (aiFeedback?.concerns || []) : (aiFeedback?.areas_of_concern || []);
  const confidenceLevel = aiFeedback?.confidence_level || null;
  
  // CV/Resume specific data
  const skillMatchScore = aiFeedback?.skill_match_score;
  const experienceMatchScore = aiFeedback?.experience_match_score;
  const locationMatchScore = aiFeedback?.location_match_score;
  const recommendation = aiFeedback?.recommendation;
  const suggestedFocus = aiFeedback?.suggested_interview_focus || [];

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
            ) : (
              <>
                {/* Score Summary Card */}
                <div className={`rounded-xl p-6 border-2 ${
                  isPassed 
                    ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                        isPassed ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
                      }`}>
                        <Award className={`h-8 w-8 ${isPassed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                      </div>
                      <div>
                        <div className={`text-4xl font-bold ${isPassed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {scorePercentage}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={`text-sm px-3 py-1 ${
                        isPassed 
                          ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700' 
                          : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700'
                      }`}>
                        {isPassed ? 'Passed' : 'Below Threshold'}
                      </Badge>
                      {hasMCQResults && (
                        <p className="text-sm text-muted-foreground">
                          {response?.correct_answers}/{response?.total_questions} correct answers
                        </p>
                      )}
                      {response?.time_taken_seconds && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                          <Clock className="h-4 w-4" />
                          Time: {formatTime(response.time_taken_seconds)}
                        </div>
                      )}
                      {confidenceLevel && (
                        <Badge variant="outline" className="text-xs capitalize">
                          <Brain className="h-3 w-3 mr-1" />
                          {confidenceLevel} confidence
                        </Badge>
                      )}
                    </div>
                  </div>
                  {(response?.completed_at || eventData?.completed_at) && (
                    <p className="text-xs text-muted-foreground mt-4 border-t pt-4">
                      Completed: {new Date(response?.completed_at || eventData?.completed_at || '').toLocaleString('en-IN', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                    </p>
                  )}
                </div>

                {/* CV/Resume Match Breakdown - shown when analysis data is available */}
                {isCVAnalysis && (skillMatchScore || experienceMatchScore || locationMatchScore) && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      ATS Match Breakdown
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {skillMatchScore !== undefined && (
                        <div className="p-3 rounded-lg bg-muted/50 border text-center">
                          <div className={`text-2xl font-bold ${skillMatchScore >= 70 ? 'text-green-600 dark:text-green-400' : skillMatchScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {skillMatchScore}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Skills Match</p>
                        </div>
                      )}
                      {experienceMatchScore !== undefined && (
                        <div className="p-3 rounded-lg bg-muted/50 border text-center">
                          <div className={`text-2xl font-bold ${experienceMatchScore >= 70 ? 'text-green-600 dark:text-green-400' : experienceMatchScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {experienceMatchScore}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Experience Match</p>
                        </div>
                      )}
                      {locationMatchScore !== undefined && (
                        <div className="p-3 rounded-lg bg-muted/50 border text-center">
                          <div className={`text-2xl font-bold ${locationMatchScore >= 70 ? 'text-green-600 dark:text-green-400' : locationMatchScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {locationMatchScore}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Location Match</p>
                        </div>
                      )}
                    </div>
                    {recommendation && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Recommendation:</span>
                        <Badge variant={recommendation === 'strong_yes' || recommendation === 'yes' ? 'default' : 'secondary'} className="capitalize">
                          {recommendation.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Feedback Section - shown when auto-progressed (no MCQ response) */}
                {hasEventData && !response && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {isCVAnalysis ? 'AI Analysis Summary' : 'AI Evaluation'}
                    </h3>

                    {/* Feedback text */}
                    {(feedbackText || eventData?.notes) && (
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <p className="text-sm text-foreground leading-relaxed">
                          {feedbackText || eventData?.notes}
                        </p>
                      </div>
                    )}

                    {/* Key Observations / Strengths */}
                    {keyObservations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">{isCVAnalysis ? 'Strengths' : 'Key Observations'}</h4>
                        <div className="space-y-1.5">
                          {keyObservations.map((obs: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{obs}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Areas of Concern */}
                    {areasOfConcern.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">{isCVAnalysis ? 'Concerns' : 'Areas of Concern'}</h4>
                        <div className="space-y-1.5">
                          {areasOfConcern.map((concern: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{concern}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Interview Focus (CV/Resume specific) */}
                    {suggestedFocus.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Suggested Interview Focus</h4>
                        <div className="flex flex-wrap gap-2">
                          {suggestedFocus.map((focus: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {focus}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Brain className="h-3 w-3 mr-1" />
                        {isCVAnalysis ? 'ATS Auto-Analyzed' : 'AI Auto-Evaluated'}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        Status: {eventData?.status}
                      </Badge>
                    </div>
                  </div>
                )}

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
                {hasMCQResults && response?.questions && (
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
                                ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800' 
                                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 p-1 rounded-full ${
                                isCorrect ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
                              }`}>
                                {isCorrect ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    Question {idx + 1}
                                  </Badge>
                                  <Badge className={`text-xs ${
                                    isCorrect 
                                      ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700' 
                                      : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700'
                                  }`}>
                                    {isCorrect ? 'Correct' : 'Incorrect'}
                                  </Badge>
                                </div>
                                <p className="font-medium text-foreground dark:text-foreground mb-3">
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
                                          className={`flex items-center gap-2 p-2 rounded-md text-sm text-foreground ${
                                            isCorrectOption 
                                              ? 'bg-green-100 border border-green-300 dark:bg-green-900/40 dark:border-green-700' 
                                              : isSelected && !isCorrectOption
                                                ? 'bg-red-100 border border-red-300 dark:bg-red-900/40 dark:border-red-700'
                                                : 'bg-background border border-border'
                                          }`}
                                        >
                                          <span className="font-medium w-6">
                                            {String.fromCharCode(65 + optIdx)}.
                                          </span>
                                          <span className="flex-1">{option}</span>
                                          {isCorrectOption && (
                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                          )}
                                          {isSelected && !isCorrectOption && (
                                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
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
                                    <span className="font-medium text-green-600 dark:text-green-400">Correct answer:</span>{' '}
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
                {!hasMCQResults && videoUrl && !hasEventData && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>This stage had a video submission without MCQ questions.</p>
                  </div>
                )}

                {/* No content at all */}
                {!hasMCQResults && !videoUrl && !hasEventData && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No detailed results available for this stage.</p>
                    <p className="text-sm mt-2">The stage may have been manually advanced.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};