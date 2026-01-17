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
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  BarChart3,
  Mail,
  ListChecks,
  MapPin
} from "lucide-react";
import { useVideoRecorder } from "@/hooks/useVideoRecorder";
import { MockInterviewResults } from "@/components/candidate/MockInterviewResults";
import { InterviewProgressTracker } from "@/components/candidate/InterviewProgressTracker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { indiaLocationData } from "@/data/indiaLocations";

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
  stageType?: 'email_info' | 'assessment' | 'slot_booking' | 'demo' | 'feedback' | 'hr_documents' | 'review';
  requiresSlotBooking?: boolean;
  autoProgressAfterCompletion?: boolean;
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
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isBookingSlot, setIsBookingSlot] = useState(false);
  const [allStageResults, setAllStageResults] = useState<any[]>([]);
  const [sessionData, setSessionData] = useState<any>(null);
  
  // New slot booking form state
  const [slotBookingForm, setSlotBookingForm] = useState({
    date: '',
    time: '',
    location: '',
    state: '',
    district: '',
    pincode: '',
    programme: '',
    segment: '',
    department: '',
    designation: '',
    classLevel: ''
  });
  
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
      const { data: fetchedSessionData, error: sessionError } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !fetchedSessionData) {
        toast.error("Invalid session. Please start a new mock interview.");
        navigate('/candidate/dashboard');
        return;
      }

      setSessionData(fetchedSessionData);

      // Get all stage results for this session
      const { data: allResults } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .eq('session_id', sessionId)
        .order('stage_order', { ascending: true });

      if (allResults) {
        setAllStageResults(allResults);
      }

      // Check if this stage was already completed
      const stageResult = allResults?.find(r => r.stage_order === parseInt(stageOrder || '1'));

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

      // Only send email if shouldSendEmail is true (not for slot booking stages)
      if (!data.isComplete && data.nextStage && data.shouldSendEmail) {
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
            toast.error("Failed to send next stage email");
          } else {
            const passedText = data.evaluation.passed ? '🎉 You passed!' : '📝 Stage completed.';
            toast.success(`${passedText} Check your email for ${data.nextStage.name} invitation!`);
          }
        } catch (emailErr) {
          console.error('Email sending error:', emailErr);
          toast.error("Failed to send next stage email");
        }
      } else if (data.requiresSlotBooking) {
        toast.success("📝 Stage completed! Please book your demo interview slot.");
      } else if (data.isComplete) {
        toast.success("🎊 Congratulations! You've completed all interview stages!");
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

  // Helper function for slot booking
  const handleSlotBooking = async () => {
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }
    
    setIsBookingSlot(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'book_slot',
          sessionId,
          stageOrder: parseInt(stageOrder || '3'),
          bookedSlot: selectedSlot
        }
      });

      if (error) throw error;

      // Send demo round invitation with booked slot
      const { error: emailError } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId,
          stageOrder: 4,
          stageName: 'Demo Round',
          stageDescription: 'Live teaching demonstration where AI evaluates your teaching clarity, subject knowledge, and presentation skills.',
          appUrl: window.location.origin,
          bookedSlot: selectedSlot
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      toast.success(`Demo slot booked for ${selectedSlot}! Check your email for details.`);
      goToDashboard();
    } catch (error) {
      console.error('Error booking slot:', error);
      toast.error("Failed to book slot");
    } finally {
      setIsBookingSlot(false);
    }
  };

  // Helper function for completing instructions
  const handleCompleteInstructions = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'complete_instructions',
          sessionId
        }
      });

      if (error) throw error;

      // Send Technical Assessment invitation
      const { error: emailError } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId,
          stageOrder: 2,
          stageName: 'Technical Assessment',
          stageDescription: 'Role-specific technical questions to assess your domain knowledge and problem-solving skills.',
          appUrl: window.location.origin
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      toast.success("Instructions reviewed! Check your email for Technical Assessment.");
      goToDashboard();
    } catch (error) {
      console.error('Error completing instructions:', error);
      toast.error("Failed to proceed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function for completing demo feedback
  const handleCompleteDemoFeedback = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'complete_demo_feedback',
          sessionId
        }
      });

      if (error) throw error;

      // Send Final Review (HR) invitation
      const { error: emailError } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId,
          stageOrder: 6,
          stageName: 'Final Review (HR)',
          stageDescription: 'HR round - Submit required documents for verification and final review.',
          appUrl: window.location.origin
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      toast.success("Feedback reviewed! Check your email for HR Round.");
      goToDashboard();
    } catch (error) {
      console.error('Error completing feedback:', error);
      toast.error("Failed to proceed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate available time slots
  const generateTimeSlots = () => {
    const slots = [];
    const today = new Date();
    for (let day = 1; day <= 5; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      const dateStr = date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      slots.push({ date: dateStr, times: ['10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '5:00 PM'] });
    }
    return slots;
  };

  // Render stage-specific content
  const renderStageContent = () => {
    if (!stage) return null;

    const currentStageOrder = sessionData?.current_stage_order || parseInt(stageOrder || '1');

    // Progress Tracker Component for all stages
    const ProgressTrackerSection = () => (
      <div className="mb-6">
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <InterviewProgressTracker
              stages={stages}
              currentStageOrder={currentStageOrder}
              stageResults={allStageResults}
            />
          </CardContent>
        </Card>
      </div>
    );

    // Stage 1: Interview Instructions
    if (stage.stageType === 'email_info' || stage.order === 1) {
      return (
        <div className="min-h-screen bg-background p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <ProgressTrackerSection />
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Interview Process Instructions</CardTitle>
                <CardDescription className="text-base mt-2">
                  Please review the complete interview process before proceeding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold">Your Interview Journey (7 Stages):</h4>
                  <div className="space-y-3">
                    {stages.map((s, idx) => (
                      <div key={s.order} className="flex items-start gap-3">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-primary text-white' : 'bg-muted-foreground/20'}`}>
                          {s.order}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <h4 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Important Guidelines:
                  </h4>
                  <ul className="mt-2 text-sm text-amber-600 dark:text-amber-300 space-y-1">
                    <li>• Ensure stable internet connection</li>
                    <li>• Use quiet environment with good lighting</li>
                    <li>• Keep camera and microphone ready</li>
                    <li>• Have documents ready for HR round</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button onClick={handleCompleteInstructions} className="w-full gap-2" size="lg" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    I Understand, Proceed to Technical Assessment
                  </Button>
                  <Button variant="outline" onClick={goToDashboard} className="w-full">
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Stage 2 & 4: Slot Booking (Technical Assessment Slot Booking or Demo Slot Booking)
    if (stage.stageType === 'slot_booking' || stage.order === 2 || stage.order === 4) {
      const timeSlots = generateTimeSlots();
      const states = Object.keys(indiaLocationData);
      const districts = slotBookingForm.state ? Object.keys(indiaLocationData[slotBookingForm.state] || {}) : [];
      
      const programmeOptions = ['State Syllabus', 'CBSE Syllabus', 'Techno Programme', 'Olympiad'];
      const segmentOptions = ['Pre-Primary', 'Primary', 'Middle School-6/7/8', 'High School-9 & 10'];
      const departmentOptions = ['Telugu', 'Hindi', 'English', 'Math', 'Science', 'Social', 'Computer'];
      const designationOptions = ['Asso.Teacher', 'Teacher', 'Vice-Principal', 'Principal', 'Zonal Co', 'R&D Head', 'SME'];
      const classOptions = ['Nursery', 'PP-1 & PP-2', 'C-1 & C-2', 'C-3, C-4 & C-5', 'C-6, C-7 & C-8', 'C-9 & C-10'];
      
      const isStage2FormValid = stage.order === 2 
        ? slotBookingForm.date && slotBookingForm.time && slotBookingForm.state && slotBookingForm.district && 
          slotBookingForm.programme && slotBookingForm.segment && slotBookingForm.department && 
          slotBookingForm.designation && slotBookingForm.classLevel
        : selectedSlot;
      
      return (
        <div className="min-h-screen bg-background p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <ProgressTrackerSection />
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">
                  {stage.order === 2 ? 'Book Your Technical Assessment Slot' : 'Book Your Demo Interview Slot'}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {stage.order === 2 
                    ? 'Fill in your details and select a convenient time for your 20-25 minute technical assessment'
                    : 'Select a convenient time for your 10-15 minute teaching demonstration'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {stage.order === 2 ? (
                  <>
                    {/* Date and Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={slotBookingForm.date}
                          onChange={(e) => setSlotBookingForm(prev => ({ ...prev, date: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time *</Label>
                        <Select 
                          value={slotBookingForm.time} 
                          onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, time: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50 max-h-60">
                            {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', 
                              '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', 
                              '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
                              '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
                              '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM'].map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Location Details */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            placeholder="Enter location"
                            value={slotBookingForm.location}
                            onChange={(e) => setSlotBookingForm(prev => ({ ...prev, location: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pincode">Pincode</Label>
                          <Input
                            id="pincode"
                            placeholder="Enter pincode"
                            value={slotBookingForm.pincode}
                            onChange={(e) => setSlotBookingForm(prev => ({ ...prev, pincode: e.target.value }))}
                            maxLength={6}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Select 
                            value={slotBookingForm.state} 
                            onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, state: value, district: '' }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50 max-h-60">
                              {states.map(state => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="district">District *</Label>
                          <Select 
                            value={slotBookingForm.district} 
                            onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, district: value }))}
                            disabled={!slotBookingForm.state}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select district" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50 max-h-60">
                              {districts.map(district => (
                                <SelectItem key={district} value={district}>{district}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Programme and Segment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="programme">Programme *</Label>
                        <Select 
                          value={slotBookingForm.programme} 
                          onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, programme: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select programme" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            {programmeOptions.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="segment">Segment *</Label>
                        <Select 
                          value={slotBookingForm.segment} 
                          onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, segment: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select segment" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            {segmentOptions.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Department and Designation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        <Select 
                          value={slotBookingForm.department} 
                          onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, department: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            {departmentOptions.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="designation">Designation *</Label>
                        <Select 
                          value={slotBookingForm.designation} 
                          onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, designation: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            {designationOptions.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Class */}
                    <div className="space-y-2">
                      <Label htmlFor="classLevel">Class *</Label>
                      <Select 
                        value={slotBookingForm.classLevel} 
                        onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, classLevel: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {classOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Summary */}
                    {slotBookingForm.date && slotBookingForm.time && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                          Selected: {new Date(slotBookingForm.date).toLocaleDateString('en-IN', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })} at {slotBookingForm.time}
                          {slotBookingForm.state && ` • ${slotBookingForm.district}, ${slotBookingForm.state}`}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Demo Interview Slot Booking - Original UI */}
                    <div className="space-y-4">
                      {timeSlots.map((slot) => (
                        <div key={slot.date} className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground">{slot.date}</h4>
                          <div className="flex flex-wrap gap-2">
                            {slot.times.map((time) => {
                              const slotValue = `${slot.date} at ${time}`;
                              return (
                                <Button
                                  key={time}
                                  variant={selectedSlot === slotValue ? "default" : "outline"}
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => setSelectedSlot(slotValue)}
                                >
                                  <Clock className="h-3 w-3" />
                                  {time}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedSlot && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                          Selected: {selectedSlot}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleSlotBooking} 
                    className="w-full gap-2" 
                    size="lg" 
                    disabled={!isStage2FormValid || isBookingSlot}
                  >
                    {isBookingSlot ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    Confirm Booking
                  </Button>
                  <Button variant="outline" onClick={goToDashboard} className="w-full">
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Stage 6: Demo Feedback
    if (stage.stageType === 'feedback' || stage.order === 6) {
      return (
        <div className="min-h-screen bg-background p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <ProgressTrackerSection />
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Demo Feedback & Metrics</CardTitle>
                <CardDescription className="text-base mt-2">
                  Review your demo teaching performance analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-center text-muted-foreground">
                    Your demo teaching has been evaluated by our AI. Review the detailed feedback below.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">85%</p>
                    <p className="text-sm text-green-700 dark:text-green-400">Overall Score</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">Passed</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">Status</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button onClick={handleCompleteDemoFeedback} className="w-full gap-2" size="lg" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    Continue to HR Round
                  </Button>
                  <Button variant="outline" onClick={goToDashboard} className="w-full">
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Stage 8: All Reviews
    if (stage.stageType === 'review' || stage.order === 8) {
      return (
        <div className="min-h-screen bg-background p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <ProgressTrackerSection />
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ListChecks className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Interview Complete - All Reviews</CardTitle>
                <CardDescription className="text-base mt-2">
                  Congratulations! Here's your complete interview summary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3">
                  {stages.filter(s => s.order < 7).map((s) => (
                    <div key={s.order} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                      <Badge variant="default">Completed</Badge>
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
                  <p className="text-4xl font-bold text-green-600 mb-2">🎊</p>
                  <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
                    Interview Process Completed!
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-2">
                    You have successfully completed all interview stages.
                  </p>
                </div>

                <Button onClick={goToDashboard} className="w-full" size="lg">
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Default: Assessment stages (Technical Assessment, HR Round, Demo Round)
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <ProgressTrackerSection />
          <Card className="w-full">
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
      </div>
    );
  };

  // Pre-start screen - render based on stage type
  return renderStageContent();
};

export default MockInterview;
