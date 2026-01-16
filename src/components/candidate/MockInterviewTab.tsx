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
  ChevronRight,
  Mic,
  Video,
  Brain
} from "lucide-react";

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

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load stages
      const { data: stagesData } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: { action: 'get_stages' }
      });
      if (stagesData?.stages) {
        setStages(stagesData.stages);
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      setProfile(profileData);

      // Load current active session
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
        
        // Load stage results for this session
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('stage_order', { ascending: true });
        
        if (resultsData) {
          setStageResults(resultsData as StageResult[]);
        }
      }

      // Load past sessions
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
      
      // Start first stage
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
      // Submit stage for evaluation
      submitStage(newAnswers);
    }
  };

  const submitStage = async (finalAnswers: string[]) => {
    setIsEvaluating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'evaluate_answers',
          sessionId: currentSession?.id,
          stageOrder: currentStage?.order,
          answers: finalAnswers,
          candidateProfile: profile
        }
      });

      if (error) throw error;

      setEvaluation(data.evaluation);
      setShowStageResult(true);

      // Refresh stage results
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

  // Show stage result
  if (showStageResult && evaluation && currentStage) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            {evaluation.passed ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-green-600">Stage Passed!</CardTitle>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-red-600">Stage Not Passed</CardTitle>
              </div>
            )}
            <CardDescription>{currentStage.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{evaluation.overallScore?.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Your Score (Passing: {currentStage.passingScore}%)</p>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-foreground">{evaluation.feedback}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {evaluation.strengths?.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-amber-600 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Areas to Improve
                </h4>
                <ul className="space-y-1">
                  {evaluation.improvements?.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              {evaluation.passed && currentStage.order < stages.length ? (
                <Button onClick={continueToNextStage} className="gap-2">
                  Continue to Next Stage
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : evaluation.passed ? (
                <Button onClick={resetSession} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Start New Session
                </Button>
              ) : (
                <Button onClick={resetSession} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show active interview
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
                <div className={`flex items-center gap-2 ${timeLeft <= 30 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  <Timer className="h-5 w-5" />
                  <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card>
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
            Practice all interview stages with AI-powered evaluation
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
            Complete all 6 stages to finish the mock interview
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
                        <Badge variant={result.passed ? 'default' : 'destructive'}>
                          {result.ai_score?.toFixed(0)}%
                        </Badge>
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
                  <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                    {session.status}
                  </Badge>
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
