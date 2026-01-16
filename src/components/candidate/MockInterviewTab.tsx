import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  FileText, 
  Phone, 
  Code, 
  Users, 
  MessageSquare, 
  ClipboardCheck,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowRight,
  Award,
  RotateCcw,
  Brain,
  Video,
  Circle,
  Square
} from "lucide-react";
import { useVideoRecorder } from "@/hooks/useVideoRecorder";
import { MockInterviewResults } from "./MockInterviewResults";

interface StageQuestion {
  id: number;
  question: string;
  type: 'text' | 'multiple_choice' | 'scenario';
  options?: string[];
  expectedPoints?: string[];
  category: string;
}

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  questionCount: number;
  timePerQuestion: number;
  passingScore: number;
}

interface StageResult {
  stage_name: string;
  stage_order: number;
  ai_score: number;
  ai_feedback: string;
  passed: boolean;
  recording_url?: string;
}

interface EvaluationResult {
  overallScore: number;
  passed: boolean;
  feedback: string;
  strengths: string[];
  improvements: string[];
  questionScores?: Array<{ questionId: number; score: number; feedback: string }>;
}

interface MockInterviewSession {
  id: string;
  status: string;
  current_stage_order: number;
  overall_score: number;
  overall_feedback: string;
  recording_url?: string;
}

export const MockInterviewTab = () => {
  const { user } = useAuth();
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [currentSession, setCurrentSession] = useState<MockInterviewSession | null>(null);
  const [stageResults, setStageResults] = useState<StageResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [currentStage, setCurrentStage] = useState<InterviewStage | null>(null);
  const [questions, setQuestions] = useState<StageQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showStageResult, setShowStageResult] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [pastSessions, setPastSessions] = useState<MockInterviewSession[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [stageRecordingUrl, setStageRecordingUrl] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const {
    isRecording,
    isPaused,
    isUploading,
    previewUrl,
    recordedBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadRecording,
    resetRecording,
    setVideoElement,
    stream
  } = useVideoRecorder();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Recording duration timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  useEffect(() => {
    if (timeLeft > 0 && currentStage && !showStageResult) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentStage && questions.length > 0 && !showStageResult) {
      handleNextQuestion();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, currentStage, showStageResult]);

  // Set video element for recording
  useEffect(() => {
    if (videoPreviewRef.current) {
      setVideoElement(videoPreviewRef.current);
    }
  }, [setVideoElement]);

  // Update video preview with stream
  useEffect(() => {
    if (videoPreviewRef.current && stream) {
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.muted = true;
      videoPreviewRef.current.play();
    }
  }, [stream]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const { data: stagesData } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: { action: 'get_stages' }
      });
      if (stagesData?.stages) {
        setStages(stagesData.stages);
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      setProfile(profileData);

      const { data: sessionData } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('candidate_id', user?.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setCurrentSession(sessionData);
        
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('stage_order', { ascending: true });
        
        if (resultsData) {
          setStageResults(resultsData as StageResult[]);
        }
      }

      const { data: pastData } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('candidate_id', user?.id)
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (pastData) {
        setPastSessions(pastData);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load interview data");
    } finally {
      setIsLoading(false);
    }
  };

  const startNewSession = async () => {
    if (!user) return;

    setIsStarting(true);
    try {
      const { data: session, error } = await supabase
        .from('mock_interview_sessions')
        .insert({
          candidate_id: user.id,
          status: 'in_progress',
          current_stage_order: 1,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(session);
      setStageResults([]);
      toast.success("Mock interview session started!");
      
      await startStage(1, session.id);

    } catch (error) {
      console.error('Error starting session:', error);
      toast.error("Failed to start session");
    } finally {
      setIsStarting(false);
    }
  };

  const startStage = async (stageOrder: number, sessionId?: string) => {
    const stage = stages.find(s => s.order === stageOrder);
    if (!stage) return;

    setCurrentStage(stage);
    setIsGenerating(true);
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setShowStageResult(false);
    setEvaluation(null);
    setRecordingDuration(0);
    setStageRecordingUrl(null);
    resetRecording();

    try {
      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'generate_questions',
          sessionId: sessionId || currentSession?.id,
          stageOrder,
          candidateProfile: profile
        }
      });

      if (error) throw error;

      if (data?.questions) {
        setQuestions(data.questions);
        setTimeLeft(data.timePerQuestion || 120);
        // Auto-start recording when questions load
        setTimeout(() => {
          startRecording();
        }, 500);
      }

    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNextQuestion = () => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = currentAnswer;
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer("");
      setTimeLeft(currentStage?.timePerQuestion || 120);
    } else {
      // Stop recording and submit stage
      if (isRecording) {
        stopRecording();
      }
      submitStage(newAnswers);
    }
  };

  const submitStage = async (finalAnswers: string[]) => {
    setIsEvaluating(true);
    
    try {
      // Upload recording if available
      let recordingUrl: string | null = null;
      if (recordedBlob && currentSession && currentStage) {
        recordingUrl = await uploadRecording(currentSession.id, currentStage.order);
        setStageRecordingUrl(recordingUrl);
      }

      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'evaluate_answers',
          sessionId: currentSession?.id,
          stageOrder: currentStage?.order,
          answers: finalAnswers,
          candidateProfile: profile,
          recordingUrl
        }
      });

      if (error) throw error;

      setEvaluation(data.evaluation);
      setShowStageResult(true);

      const { data: resultsData } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .eq('session_id', currentSession?.id)
        .order('stage_order', { ascending: true });
      
      if (resultsData) {
        setStageResults(resultsData as StageResult[]);
      }

      if (data.isComplete) {
        setCurrentSession(prev => prev ? { ...prev, status: 'completed' } : null);
        toast.success("Congratulations! You've completed all stages!");
      } else if (data.isFailed) {
        setCurrentSession(prev => prev ? { ...prev, status: 'failed' } : null);
      }

    } catch (error) {
      console.error('Error evaluating answers:', error);
      toast.error("Failed to evaluate answers");
    } finally {
      setIsEvaluating(false);
    }
  };

  const continueToNextStage = () => {
    if (currentStage && currentStage.order < stages.length) {
      startStage(currentStage.order + 1);
    }
  };

  const resetSession = () => {
    setCurrentSession(null);
    setCurrentStage(null);
    setQuestions([]);
    setAnswers([]);
    setEvaluation(null);
    setShowStageResult(false);
    setStageResults([]);
    setRecordingDuration(0);
    setStageRecordingUrl(null);
    resetRecording();
    loadData();
  };

  const getStageIcon = (stageName: string) => {
    switch (stageName) {
      case 'Resume Screening':
        return FileText;
      case 'AI Phone Interview':
        return Phone;
      case 'Technical Assessment':
        return Code;
      case 'HR Round':
        return Users;
      case 'Viva':
        return MessageSquare;
      case 'Final Review':
        return ClipboardCheck;
      default:
        return Brain;
    }
  };

  const getStageStatus = (stageOrder: number) => {
    if (!currentSession) return 'locked';
    const result = stageResults.find(r => r.stage_order === stageOrder);
    if (result) {
      return result.passed ? 'passed' : 'failed';
    }
    if (stageOrder === currentSession.current_stage_order) {
      return 'current';
    }
    if (stageOrder < currentSession.current_stage_order) {
      return 'passed';
    }
    return 'locked';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show stage result with enhanced display
  if (showStageResult && evaluation && currentStage) {
    return (
      <MockInterviewResults
        stageName={currentStage.name}
        overallScore={evaluation.overallScore}
        passed={evaluation.passed}
        passingScore={currentStage.passingScore}
        feedback={evaluation.feedback}
        strengths={evaluation.strengths || []}
        improvements={evaluation.improvements || []}
        questionScores={evaluation.questionScores}
        questions={questions}
        answers={answers}
        recordingUrl={stageRecordingUrl}
        onContinue={evaluation.passed && currentStage.order < stages.length ? continueToNextStage : undefined}
        onRetry={resetSession}
        isLastStage={currentStage.order >= stages.length}
      />
    );
  }

  // Show active interview with recording
  if (currentStage && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="space-y-6">
        {/* Stage Header */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getStageIcon(currentStage.name);
                  return <Icon className="h-6 w-6 text-primary" />;
                })()}
                <div>
                  <h3 className="font-semibold">{currentStage.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Recording Indicator */}
                {isRecording && (
                  <Badge variant="destructive" className={`flex items-center gap-1.5 ${isPaused ? 'bg-amber-500' : 'animate-pulse'}`}>
                    <Circle className="h-2 w-2 fill-current" />
                    {isPaused ? 'PAUSED' : 'REC'} {formatTime(recordingDuration)}
                  </Badge>
                )}
                <div className={`flex items-center gap-2 ${timeLeft <= 30 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  <Timer className="h-5 w-5" />
                  <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Recording Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoPreviewRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                )}
                {isRecording && !isPaused && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                      <Circle className="h-2 w-2 fill-current" />
                      LIVE
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-2 mt-3">
                {!isRecording && !previewUrl && (
                  <Button size="sm" onClick={startRecording} className="gap-1">
                    <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                    Start
                  </Button>
                )}
                {isRecording && (
                  <>
                    {isPaused ? (
                      <Button size="sm" variant="outline" onClick={resumeRecording}>
                        <Play className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={pauseRecording}>
                        Pause
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={stopRecording}>
                      <Square className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
              {recordingError && (
                <p className="text-xs text-destructive mt-2 text-center">{recordingError}</p>
              )}
            </CardContent>
          </Card>

          {/* Question Card */}
          <Card className="lg:col-span-2">
            <CardContent className="py-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <Badge variant="outline" className="mb-2">{currentQuestion.category}</Badge>
                  <p className="text-lg font-medium text-foreground">{currentQuestion.question}</p>
                </div>
              </div>

              {currentQuestion.type === 'multiple_choice' && currentQuestion.options ? (
                <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value={option} id={`option-${idx}`} />
                        <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : (
                <Textarea
                  placeholder="Type your answer here..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  className="min-h-[150px]"
                />
              )}

              <div className="flex justify-between items-center pt-4">
                <p className="text-sm text-muted-foreground">
                  {currentQuestionIndex < questions.length - 1 
                    ? `${questions.length - currentQuestionIndex - 1} questions remaining`
                    : 'This is the last question'}
                </p>
                <Button 
                  onClick={handleNextQuestion} 
                  disabled={!currentAnswer.trim()}
                  className="gap-2"
                >
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Submit Stage
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show generating state
  if (isGenerating || isEvaluating) {
    return (
      <Card className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="font-semibold text-lg">
              {isGenerating ? 'Preparing Interview Questions...' : 'AI is Evaluating Your Answers...'}
            </h3>
            <p className="text-muted-foreground">
              {isGenerating 
                ? 'Our AI is generating personalized questions based on your profile' 
                : 'Please wait while we analyze your responses'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show stages overview
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Mock Interview
          </h2>
          <p className="text-muted-foreground">
            Practice all interview stages with AI-powered evaluation and video recording
          </p>
        </div>
        {!currentSession && (
          <Button onClick={startNewSession} disabled={isStarting} className="gap-2">
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Start Mock Interview
          </Button>
        )}
      </div>

      {/* Stages Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Stages</CardTitle>
          <CardDescription>
            Complete all 6 stages to finish the mock interview. Your responses will be recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {stages.map((stage) => {
              const Icon = getStageIcon(stage.name);
              const status = getStageStatus(stage.order);
              const result = stageResults.find(r => r.stage_order === stage.order);

              return (
                <div
                  key={stage.order}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    status === 'current' ? 'border-primary bg-primary/5' :
                    status === 'passed' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                    status === 'failed' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' :
                    'border-border bg-muted/30'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    status === 'current' ? 'bg-primary text-primary-foreground' :
                    status === 'passed' ? 'bg-green-500 text-white' :
                    status === 'failed' ? 'bg-red-500 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {status === 'passed' ? <CheckCircle2 className="h-6 w-6" /> :
                     status === 'failed' ? <XCircle className="h-6 w-6" /> :
                     <Icon className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{stage.name}</h4>
                      {result && (
                        <>
                          <Badge variant={result.passed ? 'default' : 'destructive'}>
                            {result.ai_score?.toFixed(0)}%
                          </Badge>
                          {result.recording_url && (
                            <Badge variant="outline" className="gap-1">
                              <Video className="h-3 w-3" />
                              Recorded
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{stage.questionCount} questions</span>
                      <span>•</span>
                      <span>{stage.timePerQuestion}s per question</span>
                      <span>•</span>
                      <span>Passing: {stage.passingScore}%</span>
                    </div>
                  </div>
                  {status === 'current' && currentSession && (
                    <Button onClick={() => startStage(stage.order)} size="sm" className="gap-2">
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {session.status === 'completed' ? (
                      <Award className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {session.status === 'completed' ? 'Completed' : 'Not Completed'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Score: {session.overall_score?.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.recording_url && (
                      <Badge variant="outline" className="gap-1">
                        <Video className="h-3 w-3" />
                        Has Recording
                      </Badge>
                    )}
                    <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MockInterviewTab;
