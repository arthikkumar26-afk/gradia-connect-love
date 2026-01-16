import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowRight,
  Brain,
  Video,
  Circle,
  Square,
  Camera,
  Mic,
  AlertTriangle
} from "lucide-react";
import { useVideoRecorder } from "@/hooks/useVideoRecorder";
import { MockInterviewResults } from "@/components/candidate/MockInterviewResults";

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

interface EvaluationResult {
  overallScore: number;
  passed: boolean;
  feedback: string;
  strengths: string[];
  improvements: string[];
  questionScores?: Array<{ questionId: number; score: number; feedback: string }>;
}

const MockInterview = () => {
  const { sessionId, stageOrder } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [stage, setStage] = useState<InterviewStage | null>(null);
  const [questions, setQuestions] = useState<StageQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [stageRecordingUrl, setStageRecordingUrl] = useState<string | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [stages, setStages] = useState<InterviewStage[]>([]);

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

  // Load initial data
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/candidate/login');
      return;
    }
    loadData();
  }, [authLoading, isAuthenticated, sessionId, stageOrder]);

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
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording, isPaused]);

  // Question timer
  useEffect(() => {
    if (timeLeft > 0 && isStarted && !showResult) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isStarted && questions.length > 0 && !showResult) {
      handleNextQuestion();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isStarted, showResult]);

  // Video element setup
  useEffect(() => {
    if (videoPreviewRef.current) {
      setVideoElement(videoPreviewRef.current);
    }
  }, [setVideoElement]);

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

      // Get stages
      const { data: stagesData } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: { action: 'get_stages' }
      });
      if (stagesData?.stages) {
        setStages(stagesData.stages);
        const currentStage = stagesData.stages.find((s: InterviewStage) => s.order === parseInt(stageOrder || '1'));
        setStage(currentStage);
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      setProfile(profileData);

      // Verify session exists
      const { data: sessionData, error: sessionError } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        toast.error("Invalid session. Please start a new mock interview.");
        navigate('/candidate/dashboard');
        return;
      }

      // Check if this stage was already completed
      const { data: stageResult } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('stage_order', parseInt(stageOrder || '1'))
        .maybeSingle();

      if (stageResult?.completed_at) {
        // Stage already completed, show results with strengths and improvements
        const strengths = (stageResult.strengths as string[]) || [];
        const improvements = (stageResult.improvements as string[]) || [];
        const questionScores = (stageResult.question_scores as Array<{ questionId: number; score: number; feedback: string }>) || [];
        
        setEvaluation({
          overallScore: stageResult.ai_score || 0,
          passed: stageResult.passed || false,
          feedback: stageResult.ai_feedback || '',
          strengths,
          improvements,
          questionScores
        });
        setStageRecordingUrl(stageResult.recording_url);
        setShowResult(true);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load interview data");
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionsGranted(true);
      return true;
    } catch (error) {
      console.error('Permission denied:', error);
      toast.error("Please allow camera and microphone access to continue");
      return false;
    }
  };

  const startInterview = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'generate_questions',
          sessionId,
          stageOrder: parseInt(stageOrder || '1'),
          candidateProfile: profile
        }
      });

      if (error) throw error;

      if (data?.questions) {
        setQuestions(data.questions);
        setTimeLeft(data.timePerQuestion || 120);
        setIsStarted(true);
        
        // Auto-start recording
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
      setTimeLeft(stage?.timePerQuestion || 120);
    } else {
      if (isRecording) {
        stopRecording();
      }
      submitStage(newAnswers);
    }
  };

  const submitStage = async (finalAnswers: string[]) => {
    setIsEvaluating(true);
    
    try {
      let recordingUrl: string | null = null;
      if (recordedBlob && sessionId && stage) {
        recordingUrl = await uploadRecording(sessionId, stage.order);
        setStageRecordingUrl(recordingUrl);
      }

      console.log('Submitting stage:', { sessionId, stageOrder, answersCount: finalAnswers.length });

      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'evaluate_answers',
          sessionId,
          stageOrder: parseInt(stageOrder || '1'),
          answers: finalAnswers,
          candidateProfile: profile,
          recordingUrl
        }
      });

      if (error) {
        console.error('Evaluation error:', error);
        throw error;
      }

      console.log('Evaluation result:', data);

      setEvaluation(data.evaluation);
      setShowResult(true);

      // If passed and not complete, automatically send email for next stage
      if (data.evaluation.passed && !data.isComplete && data.nextStage) {
        console.log('Sending next stage invitation:', data.nextStage);
        
        try {
          const { error: emailError } = await supabase.functions.invoke('send-mock-interview-invitation', {
            body: {
              candidateEmail: profile?.email,
              candidateName: profile?.full_name || 'Candidate',
              sessionId,
              stageOrder: data.nextStageOrder,
              stageName: data.nextStage.name,
              stageDescription: data.nextStage.description,
              appUrl: window.location.origin
            }
          });

          if (emailError) {
            console.error('Email error:', emailError);
            toast.error("Stage passed but failed to send next stage email");
          } else {
            toast.success(`🎉 You passed! Check your email for ${data.nextStage.name} invitation!`);
          }
        } catch (emailErr) {
          console.error('Email sending error:', emailErr);
          toast.error("Stage passed but failed to send next stage email");
        }
      } else if (data.isComplete) {
        toast.success("🎊 Congratulations! You've completed all interview stages!");
      } else if (data.isFailed) {
        toast.error(`Unfortunately you didn't pass ${stage?.name}. Keep practicing!`);
      }

    } catch (error) {
      console.error('Error evaluating answers:', error);
      toast.error("Failed to evaluate answers. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const goToDashboard = () => {
    navigate('/candidate/dashboard');
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show results
  if (showResult && evaluation && stage) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <MockInterviewResults
            stageName={stage.name}
            overallScore={evaluation.overallScore}
            passed={evaluation.passed}
            passingScore={stage.passingScore}
            feedback={evaluation.feedback}
            strengths={evaluation.strengths || []}
            improvements={evaluation.improvements || []}
            questionScores={evaluation.questionScores}
            questions={questions}
            answers={answers}
            recordingUrl={stageRecordingUrl}
            onRetry={goToDashboard}
            isLastStage={stage.order >= stages.length}
          />
          <div className="mt-6 text-center">
            <Button onClick={goToDashboard} variant="outline">
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show generating/evaluating state
  if (isGenerating || isEvaluating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg">
              {isGenerating ? 'Preparing Your Interview...' : 'AI is Evaluating...'}
            </h3>
            <p className="text-muted-foreground mt-2">
              {isGenerating 
                ? 'Generating personalized questions based on your profile' 
                : 'Analyzing your responses and recording'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active interview
  if (isStarted && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">{stage?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
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
                  <video
                    ref={videoPreviewRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {isRecording && !isPaused && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                        <Circle className="h-2 w-2 fill-current" />
                        LIVE
                      </Badge>
                    </div>
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
      </div>
    );
  }

  // Pre-start screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{stage?.name}</CardTitle>
          <CardDescription className="text-base mt-2">
            {stage?.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Before you begin:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Camera access will be required for recording
              </li>
              <li className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Microphone access will be required
              </li>
              <li className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                {stage?.questionCount} questions, {stage?.timePerQuestion}s each
              </li>
              <li className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Your entire session will be recorded
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={startInterview} className="w-full gap-2" size="lg">
              <Play className="h-5 w-5" />
              Start Interview
            </Button>
            <Button variant="outline" onClick={goToDashboard} className="w-full">
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockInterview;
