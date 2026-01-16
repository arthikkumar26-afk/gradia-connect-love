import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Code, 
  Users, 
  MessageSquare, 
  ClipboardCheck,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  Brain,
  Video,
  Mail,
  Clock,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  questionCount: number;
  timePerQuestion: number;
  passingScore: number;
}

interface QuestionScore {
  questionId: number;
  score: number;
  feedback: string;
}

interface StageResult {
  id: string;
  stage_name: string;
  stage_order: number;
  ai_score: number;
  ai_feedback: string;
  passed: boolean;
  recording_url?: string;
  completed_at?: string;
  strengths?: string[];
  improvements?: string[];
  question_scores?: unknown; // JSON from database
}

interface MockInterviewSession {
  id: string;
  status: string;
  current_stage_order: number;
  overall_score: number;
  overall_feedback: string;
  recording_url?: string;
  created_at: string;
  completed_at?: string;
}

export const MockInterviewTab = () => {
  const { user } = useAuth();
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [currentSession, setCurrentSession] = useState<MockInterviewSession | null>(null);
  const [stageResults, setStageResults] = useState<StageResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [pastSessions, setPastSessions] = useState<MockInterviewSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<MockInterviewSession | null>(null);
  const [selectedStageResults, setSelectedStageResults] = useState<StageResult[]>([]);
  const [viewingRecording, setViewingRecording] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Get stages
      const { data: stagesData } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: { action: 'get_stages' }
      });
      if (stagesData?.stages) {
        setStages(stagesData.stages);
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      setProfile(profileData);

      // Get current in-progress session
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
        
        // Get stage results for current session
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('stage_order', { ascending: true });
        
        if (resultsData) {
          setStageResults(resultsData as StageResult[]);
        }
      }

      // Get past completed/failed sessions
      const { data: pastData } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('candidate_id', user?.id)
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(10);

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
    if (!user || !profile) {
      toast.error("Please complete your profile first");
      return;
    }

    setIsStarting(true);
    try {
      // Create new session
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

      // Send email invitation for Stage 1
      const stage1 = stages[0];
      const { error: emailError } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile.email,
          candidateName: profile.full_name,
          sessionId: session.id,
          stageOrder: 1,
          stageName: stage1.name,
          stageDescription: stage1.description,
          appUrl: window.location.origin
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast.error("Could not send invitation email. Please try again.");
        return;
      }

      setCurrentSession(session);
      setStageResults([]);
      toast.success("Invitation sent! Check your email to start the interview.");

    } catch (error) {
      console.error('Error starting session:', error);
      toast.error("Failed to start session");
    } finally {
      setIsStarting(false);
    }
  };

  const resendInvitation = async () => {
    if (!currentSession || !profile || !stages.length) return;

    setIsStarting(true);
    try {
      const currentStageOrder = currentSession.current_stage_order;
      const currentStage = stages.find(s => s.order === currentStageOrder);

      if (!currentStage) return;

      const { error: emailError } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile.email,
          candidateName: profile.full_name,
          sessionId: currentSession.id,
          stageOrder: currentStageOrder,
          stageName: currentStage.name,
          stageDescription: currentStage.description,
          appUrl: window.location.origin
        }
      });

      if (emailError) throw emailError;

      toast.success("Invitation resent! Check your email.");
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error("Failed to resend invitation");
    } finally {
      setIsStarting(false);
    }
  };

  const loadSessionResults = async (session: MockInterviewSession) => {
    try {
      const { data: resultsData } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .eq('session_id', session.id)
        .order('stage_order', { ascending: true });
      
      setSelectedSession(session);
      setSelectedStageResults((resultsData || []) as StageResult[]);
    } catch (error) {
      console.error('Error loading session results:', error);
    }
  };

  const getStageIcon = (stageName: string) => {
    switch (stageName) {
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
    if (result?.completed_at) {
      return result.passed ? 'passed' : 'failed';
    }
    if (stageOrder === currentSession.current_stage_order) {
      return 'pending';
    }
    if (stageOrder < currentSession.current_stage_order) {
      return 'passed';
    }
    return 'locked';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Interview</TabsTrigger>
          <TabsTrigger value="history">Interview History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                AI Mock Interview
              </h2>
              <p className="text-muted-foreground">
                Complete all stages via email invitations - just like a real interview process
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

          {/* Email Instructions */}
          {currentSession && currentSession.status === 'in_progress' && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Check Your Email!</h3>
                    <p className="text-muted-foreground mt-1">
                      An invitation for <strong>Stage {currentSession.current_stage_order}</strong> has been sent to <strong>{profile?.email}</strong>. 
                      Click the link in the email to start your interview.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 gap-2"
                      onClick={resendInvitation}
                      disabled={isStarting}
                    >
                      {isStarting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                      Resend Invitation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stages Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>Interview Stages</CardTitle>
              <CardDescription>
                Complete all 4 stages. You'll receive an email for each stage after passing the previous one.
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
                        status === 'pending' ? 'border-primary bg-primary/5' :
                        status === 'passed' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                        status === 'failed' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' :
                        'border-border bg-muted/30'
                      }`}
                    >
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        status === 'pending' ? 'bg-primary text-primary-foreground' :
                        status === 'passed' ? 'bg-green-500 text-white' :
                        status === 'failed' ? 'bg-red-500 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {status === 'passed' ? <CheckCircle2 className="h-6 w-6" /> :
                         status === 'failed' ? <XCircle className="h-6 w-6" /> :
                         status === 'pending' ? <Clock className="h-6 w-6" /> :
                         <Icon className="h-6 w-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{stage.name}</h4>
                          {result?.completed_at && (
                            <>
                              <Badge variant={result.passed ? 'default' : 'destructive'}>
                                {result.ai_score?.toFixed(0)}%
                              </Badge>
                              {result.recording_url && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1 h-6 text-xs">
                                      <Video className="h-3 w-3" />
                                      View Recording
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle>{stage.name} - Recording</DialogTitle>
                                    </DialogHeader>
                                    <video 
                                      src={result.recording_url} 
                                      controls 
                                      className="w-full rounded-lg"
                                    />
                                  </DialogContent>
                                </Dialog>
                              )}
                            </>
                          )}
                          {status === 'pending' && (
                            <Badge variant="outline" className="gap-1">
                              <Mail className="h-3 w-3" />
                              Awaiting Response
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
                        
                        {/* Show feedback for completed stages */}
                        {result?.completed_at && result.ai_feedback && (
                          <div className="mt-3 p-3 bg-background rounded border">
                            <p className="text-sm">{result.ai_feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Session Complete/Failed State */}
          {currentSession && (currentSession.status === 'completed' || currentSession.status === 'failed') && (
            <Card className={currentSession.status === 'completed' ? 'border-green-500' : 'border-red-500'}>
              <CardContent className="py-6 text-center">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  currentSession.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {currentSession.status === 'completed' ? (
                    <Award className="h-8 w-8" />
                  ) : (
                    <XCircle className="h-8 w-8" />
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {currentSession.status === 'completed' ? 'Congratulations!' : 'Interview Not Passed'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {currentSession.overall_feedback || (currentSession.status === 'completed' 
                    ? 'You have successfully completed all interview stages!' 
                    : 'Keep practicing and try again!')}
                </p>
                <div className="text-3xl font-bold text-primary mb-4">
                  {currentSession.overall_score?.toFixed(0)}%
                </div>
                <Button onClick={() => { setCurrentSession(null); loadData(); }} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Start New Interview
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Interview History</h2>
            <p className="text-muted-foreground">View your past mock interviews with recordings and feedback</p>
          </div>

          {pastSessions.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Past Interviews</h3>
                <p className="text-muted-foreground">Complete a mock interview to see your history here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastSessions.map((session) => (
                <Card 
                  key={session.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedSession?.id === session.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => loadSessionResults(session)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          session.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {session.status === 'completed' ? (
                            <Award className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            Mock Interview - {formatDate(session.created_at)}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {session.status === 'completed' ? 'All stages completed' : `Failed at stage ${session.current_stage_order}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {session.overall_score?.toFixed(0)}%
                          </div>
                          <Badge variant={session.status === 'completed' ? 'default' : 'destructive'}>
                            {session.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Selected Session Details */}
          {selectedSession && selectedStageResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Session Details - {formatDate(selectedSession.created_at)}</CardTitle>
                <CardDescription>{selectedSession.overall_feedback}</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {selectedStageResults.map((result) => (
                      <div key={result.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              result.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {result.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                            </div>
                            <div>
                              <h4 className="font-semibold">{result.stage_name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {result.completed_at ? formatDate(result.completed_at) : 'Not completed'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.passed ? 'default' : 'destructive'}>
                              {result.ai_score?.toFixed(0)}%
                            </Badge>
                            {result.recording_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-1">
                                    <Video className="h-3 w-3" />
                                    Recording
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>{result.stage_name} - Recording</DialogTitle>
                                  </DialogHeader>
                                  <video 
                                    src={result.recording_url} 
                                    controls 
                                    className="w-full rounded-lg"
                                  />
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>

                        {/* Feedback */}
                        {result.ai_feedback && (
                          <div className="p-3 bg-muted/50 rounded-lg mb-3">
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Brain className="h-4 w-4" />
                              AI Feedback
                            </h5>
                            <p className="text-sm text-muted-foreground">{result.ai_feedback}</p>
                          </div>
                        )}

                        {/* Strengths & Improvements */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {/* Strengths (Positive Points) */}
                          {result.strengths && result.strengths.length > 0 && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                              <h5 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                                <ThumbsUp className="h-4 w-4" />
                                Strengths
                              </h5>
                              <ul className="space-y-1">
                                {result.strengths.map((s, i) => (
                                  <li key={i} className="text-xs text-green-600 dark:text-green-400 flex items-start gap-1">
                                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Improvements (Negative Points) */}
                          {result.improvements && result.improvements.length > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                              <h5 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <ThumbsDown className="h-4 w-4" />
                                Areas to Improve
                              </h5>
                              <ul className="space-y-1">
                                {result.improvements.map((s, i) => (
                                  <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1">
                                    <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Score Progress */}
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Score</span>
                            <span className="font-medium">{result.ai_score?.toFixed(0)}%</span>
                          </div>
                          <Progress value={result.ai_score || 0} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MockInterviewTab;
