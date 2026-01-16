import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Play,
  Loader2,
  Brain,
  GraduationCap,
  CheckCircle2,
  Clock,
  Mail,
  Code,
  Calendar,
  Monitor,
  BarChart3,
  FileText,
  ListChecks,
  Lock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InterviewProgressTracker } from "@/components/candidate/InterviewProgressTracker";

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  questionCount: number;
  timePerQuestion: number;
  passingScore: number;
  stageType?: 'email_info' | 'assessment' | 'slot_booking' | 'demo' | 'feedback' | 'hr_documents' | 'review';
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
  question_scores?: {
    teachingClarity?: { score: number; feedback: string };
    subjectKnowledge?: { score: number; feedback: string };
    presentationSkills?: { score: number; feedback: string };
    timeManagement?: { score: number; feedback: string };
    overallPotential?: { score: number; feedback: string };
  };
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
  const navigate = useNavigate();
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [currentSession, setCurrentSession] = useState<MockInterviewSession | null>(null);
  const [stageResults, setStageResults] = useState<StageResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [showSlotBooking, setShowSlotBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isBookingSlot, setIsBookingSlot] = useState(false);
  const [isAcknowledgingFeedback, setIsAcknowledgingFeedback] = useState(false);

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Refresh data when tab becomes visible (user comes back from interview page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        loadData();
      }
    };

    const handleFocus = () => {
      if (user) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
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

      // Get the most recent session
      const { data: recentSession } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('candidate_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentSession) {
        setCurrentSession(recentSession);
        
        // Get stage results for this session
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', recentSession.id)
          .order('stage_order', { ascending: true });
        
        if (resultsData) {
          setStageResults(resultsData as StageResult[]);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const sendInterviewInstructionsEmail = async (sessionId: string) => {
    try {
      const appUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile.email,
          candidateName: profile.full_name,
          sessionId: sessionId,
          stageOrder: 1,
          stageName: 'Interview Instructions',
          stageDescription: 'Receive detailed interview process instructions and guidelines via email.',
          appUrl: appUrl
        }
      });

      if (error) throw error;
      console.log('Interview instructions email sent:', data);
      return true;
    } catch (error) {
      console.error('Error sending interview instructions email:', error);
      return false;
    }
  };

  const sendTechnicalAssessmentEmail = async (sessionId: string) => {
    try {
      const appUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile.email,
          candidateName: profile.full_name,
          sessionId: sessionId,
          stageOrder: 2,
          stageName: 'Technical Assessment',
          stageDescription: 'Answer 8 domain-specific questions to assess your technical knowledge. Your responses will be video recorded.',
          appUrl: appUrl
        }
      });

      if (error) throw error;
      console.log('Technical Assessment email sent:', data);
      return true;
    } catch (error) {
      console.error('Error sending Technical Assessment email:', error);
      return false;
    }
  };

  const completeInstructionsStage = async (sessionId: string) => {
    try {
      // Create stage result for Interview Instructions
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: sessionId,
          stage_name: 'Interview Instructions',
          stage_order: 1,
          ai_score: 100,
          ai_feedback: 'Interview instructions sent successfully via email.',
          passed: true,
          completed_at: new Date().toISOString()
        });

      // Update session to move to next stage
      await supabase
        .from('mock_interview_sessions')
        .update({ current_stage_order: 2 })
        .eq('id', sessionId);

      return true;
    } catch (error) {
      console.error('Error completing instructions stage:', error);
      return false;
    }
  };

  const startMockTest = async () => {
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

      // Send interview instructions email
      const instructionsEmailSent = await sendInterviewInstructionsEmail(session.id);
      
      if (instructionsEmailSent) {
        // Complete stage 1 and move to stage 2
        await completeInstructionsStage(session.id);
        
        // Automatically send Technical Assessment email
        await sendTechnicalAssessmentEmail(session.id);
        
        // Reload session data
        const { data: updatedSession } = await supabase
          .from('mock_interview_sessions')
          .select('*')
          .eq('id', session.id)
          .single();
        
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', session.id)
          .order('stage_order', { ascending: true });

        setCurrentSession(updatedSession);
        setStageResults(resultsData as StageResult[] || []);
        toast.success("Instructions & Technical Assessment invitation sent to your email!");
      } else {
        setCurrentSession(session);
        setStageResults([]);
        toast.warning("Mock test started, but email sending failed. Please check your email settings.");
      }

    } catch (error) {
      console.error('Error starting session:', error);
      toast.error("Failed to start mock test");
    } finally {
      setIsStarting(false);
    }
  };

  const startNewSession = async () => {
    if (!user || !profile) {
      toast.error("Please complete your profile first");
      return;
    }

    setIsStarting(true);
    try {
      // Create new session (reset)
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

      // Send interview instructions email
      const instructionsEmailSent = await sendInterviewInstructionsEmail(session.id);
      
      if (instructionsEmailSent) {
        // Complete stage 1 and move to stage 2
        await completeInstructionsStage(session.id);
        
        // Automatically send Technical Assessment email
        await sendTechnicalAssessmentEmail(session.id);
        
        // Reload session data
        const { data: updatedSession } = await supabase
          .from('mock_interview_sessions')
          .select('*')
          .eq('id', session.id)
          .single();
        
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', session.id)
          .order('stage_order', { ascending: true });

        setCurrentSession(updatedSession);
        setStageResults(resultsData as StageResult[] || []);
        toast.success("New interview started! Emails sent.");
      } else {
        setCurrentSession(session);
        setStageResults([]);
        toast.warning("New session started, but email sending failed.");
      }

    } catch (error) {
      console.error('Error starting new session:', error);
      toast.error("Failed to start new session");
    } finally {
      setIsStarting(false);
    }
  };

  const goToStage = (stageOrder: number) => {
    if (!currentSession) return;
    navigate(`/candidate/mock-interview/${currentSession.id}/${stageOrder}`);
  };

  // Generate available time slots for today and next 6 days
  const generateTimeSlots = () => {
    const slots: { date: string; time: string; value: string }[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    for (let day = 0; day <= 6; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      
      // Check if today, tomorrow, or other day
      const isToday = day === 0;
      const isTomorrow = day === 1;
      let dateStr: string;
      
      if (isToday) {
        dateStr = 'Today';
      } else if (isTomorrow) {
        dateStr = 'Tomorrow';
      } else {
        dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
      
      // All available time slots
      const allSlots = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
      
      allSlots.forEach(time => {
        const slotDate = new Date(date);
        const [hours, minutesPart] = time.split(':');
        const minutes = parseInt(minutesPart);
        let hour = parseInt(hours);
        if (time.includes('PM') && hour !== 12) hour += 12;
        if (time.includes('AM') && hour === 12) hour = 0;
        slotDate.setHours(hour, minutes, 0, 0);
        
        // Skip past slots for today
        if (isToday && hour <= currentHour) {
          return;
        }
        
        slots.push({
          date: dateStr,
          time,
          value: slotDate.toISOString()
        });
      });
    }
    
    return slots;
  };

  const bookDemoSlot = async () => {
    if (!selectedSlot || !currentSession) {
      toast.error("Please select a time slot");
      return;
    }

    setIsBookingSlot(true);
    try {
      // Determine the actual slot time
      let slotTime: Date;
      let slotLabel: string;
      
      if (selectedSlot === 'immediately') {
        slotTime = new Date();
        slotLabel = 'Immediately';
      } else if (selectedSlot === 'next_10_min') {
        slotTime = new Date(Date.now() + 10 * 60 * 1000);
        slotLabel = 'In 10 minutes';
      } else {
        slotTime = new Date(selectedSlot);
        slotLabel = slotTime.toLocaleString();
      }

      // Create stage result for slot booking
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: currentSession.id,
          stage_name: 'Demo Slot Booking',
          stage_order: 3,
          ai_score: 100,
          ai_feedback: `Demo slot booked: ${slotLabel}`,
          passed: true,
          completed_at: new Date().toISOString()
        });

      // Update session to move to next stage
      await supabase
        .from('mock_interview_sessions')
        .update({ current_stage_order: 4 })
        .eq('id', currentSession.id);

      // Send Demo Round invitation email
      await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId: currentSession.id,
          stageOrder: 4,
          stageName: 'Demo Round',
          stageDescription: 'Conduct your live teaching demonstration. Your session will be recorded and evaluated by AI.',
          appUrl: window.location.origin,
          bookedSlot: slotLabel
        }
      });

      toast.success(`Slot booked: ${slotLabel}! Check email for Demo Round.`);
      setShowSlotBooking(false);
      setSelectedSlot('');
      loadData(); // Refresh the data
    } catch (error) {
      console.error('Error booking slot:', error);
      toast.error("Failed to book slot");
    } finally {
      setIsBookingSlot(false);
    }
  };

  // Acknowledge feedback and proceed to next stage
  const acknowledgeFeedbackAndProceed = async () => {
    if (!currentSession || !profile) return;
    
    setIsAcknowledgingFeedback(true);
    try {
      // Get Demo Round result for email
      const demoResult = stageResults.find(r => r.stage_order === 4);
      
      // Create stage result for Demo Feedback review
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: currentSession.id,
          stage_name: 'Demo Feedback',
          stage_order: 5,
          ai_score: 100,
          ai_feedback: 'Candidate reviewed demo feedback and acknowledged areas for improvement.',
          passed: true,
          completed_at: new Date().toISOString()
        });

      // Update session to next stage
      await supabase
        .from('mock_interview_sessions')
        .update({ current_stage_order: 6 })
        .eq('id', currentSession.id);

      // Send feedback summary email
      await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId: currentSession.id,
          stageOrder: 5,
          stageName: 'Demo Feedback Summary',
          stageDescription: 'Your Demo Round feedback summary',
          appUrl: window.location.origin,
          feedbackData: demoResult ? {
            score: demoResult.ai_score,
            passed: demoResult.passed,
            feedback: demoResult.ai_feedback,
            strengths: demoResult.strengths,
            improvements: demoResult.improvements,
            questionScores: demoResult.question_scores
          } : null
        }
      });

      // Send next stage email (HR Documents)
      await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId: currentSession.id,
          stageOrder: 6,
          stageName: 'HR Documents',
          stageDescription: 'Submit required documents for verification and final review.',
          appUrl: window.location.origin
        }
      });

      toast.success('Feedback acknowledged! Check email for HR Documents stage.');
      setExpandedStage(null);
      loadData();
    } catch (error) {
      console.error('Error acknowledging feedback:', error);
      toast.error('Failed to proceed to next stage');
    } finally {
      setIsAcknowledgingFeedback(false);
    }
  };

  const getStageStatus = (stageOrder: number) => {
    if (!currentSession) return 'locked';
    const result = stageResults.find(r => r.stage_order === stageOrder);
    if (result?.completed_at) return 'completed';
    if (stageOrder === currentSession.current_stage_order) return 'current';
    if (stageOrder < currentSession.current_stage_order) return 'completed';
    return 'locked';
  };

  const getStageIcon = (stageOrder: number) => {
    switch (stageOrder) {
      case 1: return Mail;
      case 2: return Code;
      case 3: return Calendar;
      case 4: return Monitor;
      case 5: return BarChart3;
      case 6: return FileText;
      case 7: return ListChecks;
      default: return Brain;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No session - Show start screen
  if (!currentSession) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Mock Interview Practice
          </h2>
          <p className="text-muted-foreground mt-2">
            Practice your interview skills with AI-powered mock tests
          </p>
        </div>

        {/* Main Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center pb-4">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-xl">AI Mock Test</CardTitle>
            <CardDescription className="text-base">
              Complete a comprehensive 7-stage interview simulation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 7 Stages Preview */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground">Interview Stages:</h4>
              <div className="grid gap-2">
                {[
                  { order: 1, name: "Interview Instructions", icon: Mail },
                  { order: 2, name: "Technical Assessment", icon: Code },
                  { order: 3, name: "Demo Slot Booking", icon: Calendar },
                  { order: 4, name: "Demo Round", icon: Monitor },
                  { order: 5, name: "Demo Feedback", icon: BarChart3 },
                  { order: 6, name: "Final Review (HR)", icon: FileText },
                  { order: 7, name: "All Reviews", icon: ListChecks },
                ].map((stage) => (
                  <div key={stage.order} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <stage.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{stage.order}. {stage.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <Button 
                onClick={startMockTest} 
                disabled={isStarting} 
                className="w-full gap-2" 
                size="lg"
              >
                {isStarting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Attend Mock Test
              </Button>
            </div>

            <div className="flex justify-center">
              <Badge variant="secondary" className="text-xs">
                Estimated time: 45-60 minutes
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active or completed session - Show progress tracker with stages
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Mock Interview
          </h2>
          <p className="text-muted-foreground">
            {currentSession.status === 'completed' 
              ? 'Interview completed! View your results below.'
              : currentSession.status === 'failed'
                ? 'Interview ended. Start a new one to try again.'
                : 'Complete each stage to advance to the next round.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => loadData()} disabled={isLoading} variant="outline" size="icon" className="h-10 w-10">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={startNewSession} disabled={isStarting} variant="default" className="gap-2">
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Mock Interview
          </Button>
        </div>
      </div>

      {/* Progress Tracker */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <InterviewProgressTracker
            stages={stages}
            currentStageOrder={currentSession.current_stage_order}
            stageResults={stageResults}
          />
        </CardContent>
      </Card>

      {/* Stage Cards */}
      <div className="grid gap-4">
        {stages.map((stage) => {
          const status = getStageStatus(stage.order);
          const Icon = getStageIcon(stage.order);
          const result = stageResults.find(r => r.stage_order === stage.order);
          const isExpanded = expandedStage === stage.order;
          const hasResults = result?.completed_at && stage.order !== 1;

          return (
            <Card 
              key={stage.order}
              className={`transition-all ${
                status === 'current' ? 'border-primary shadow-md' :
                status === 'completed' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' :
                'opacity-60'
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : status === 'locked' ? (
                      <Lock className="h-5 w-5" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{stage.name}</h3>
                      {/* Only show score for stages other than Interview Instructions (stage 1) */}
                      {result?.ai_score !== undefined && stage.order !== 1 && (
                        <Badge variant="default" className="bg-green-500">
                          {result.ai_score.toFixed(0)}%
                        </Badge>
                      )}
                      {status === 'current' && (
                        <Badge variant="outline" className="animate-pulse border-primary text-primary">
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{stage.description}</p>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {/* For stage 1 (Interview Instructions), don't show View Results - just show email sent indicator */}
                    {status === 'completed' && stage.order === 1 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Mail className="h-3 w-3 mr-1" />
                        Email Sent
                      </Badge>
                    )}
                    {/* For Technical Assessment (stage 2) in progress, show email sent indicator instead of Continue button */}
                    {status === 'current' && stage.order === 2 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Mail className="h-3 w-3 mr-1" />
                        Check Email to Start
                      </Badge>
                    )}
                    {/* For Demo Slot Booking (stage 3) in progress, show Book Slot button */}
                    {status === 'current' && stage.order === 3 && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => setShowSlotBooking(true)}
                        className="gap-1"
                      >
                        <Calendar className="h-4 w-4" />
                        Book Slot
                      </Button>
                    )}
                    {/* For Demo Feedback (stage 5) in progress, show View Feedback button to expand inline */}
                    {status === 'current' && stage.order === 5 && currentSession && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => setExpandedStage(isExpanded ? null : stage.order)}
                        className="gap-1"
                      >
                        <BarChart3 className="h-4 w-4" />
                        {isExpanded ? 'Hide Feedback' : 'View Feedback'}
                      </Button>
                    )}
                    {/* For completed stages with results, show expand/collapse button */}
                    {hasResults && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setExpandedStage(isExpanded ? null : stage.order)}
                        className="gap-1"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? 'Hide Results' : 'View Results'}
                      </Button>
                    )}
                    {status === 'locked' && (
                      <Button variant="ghost" disabled size="sm">
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Results Section */}
                {isExpanded && hasResults && result && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* AI Feedback */}
                    {result.ai_feedback && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm text-foreground">{result.ai_feedback}</p>
                      </div>
                    )}

                    {/* Criteria Breakdown for Demo Round (stage 4) */}
                    {result.question_scores && Object.keys(result.question_scores).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground">Criteria Breakdown</h4>
                        {Object.entries(result.question_scores).map(([key, value]) => {
                          const labels: Record<string, string> = {
                            teachingClarity: 'Teaching Clarity',
                            subjectKnowledge: 'Subject Knowledge',
                            presentationSkills: 'Presentation Skills',
                            timeManagement: 'Time Management',
                            overallPotential: 'Overall Potential'
                          };
                          const scoreColor = value.score >= 80 ? 'text-green-600' : value.score >= 65 ? 'text-amber-600' : 'text-red-600';
                          const progressColor = value.score >= 80 ? 'bg-green-500' : value.score >= 65 ? 'bg-amber-500' : 'bg-red-500';
                          
                          return (
                            <div key={key} className="p-3 rounded-lg border bg-card">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{labels[key] || key}</span>
                                <span className={`text-sm font-bold ${scoreColor}`}>{value.score}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                                <div className={`h-full ${progressColor}`} style={{ width: `${value.score}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground">{value.feedback}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Strengths & Improvements Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Positive Points (Strengths) */}
                      {result.strengths && result.strengths.length > 0 && (
                        <div className="p-3 rounded-lg border border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                            <TrendingUp className="h-4 w-4" />
                            Positive Points
                          </h4>
                          <ul className="space-y-2">
                            {result.strengths.map((strength, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-foreground">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Negative Points (Areas to Improve) */}
                      {result.improvements && result.improvements.length > 0 && (
                        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                            <TrendingDown className="h-4 w-4" />
                            Areas to Improve
                          </h4>
                          <ul className="space-y-2">
                            {result.improvements.map((improvement, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Target className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <span className="text-foreground">{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Button - Full details or Acknowledge */}
                    <div className="flex justify-center pt-2">
                      {stage.order === 4 && getStageStatus(5) === 'current' && (
                        <Button 
                          onClick={acknowledgeFeedbackAndProceed}
                          disabled={isAcknowledgingFeedback}
                          className="gap-2"
                        >
                          {isAcknowledgingFeedback ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          Acknowledge & Proceed to HR Documents
                        </Button>
                      )}
                      {stage.order !== 4 && (
                        <Button variant="outline" size="sm" onClick={() => goToStage(stage.order)}>
                          View Full Details
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Demo Feedback Stage (5) - Show Demo Round results inline */}
                {isExpanded && status === 'current' && stage.order === 5 && !hasResults && (() => {
                  const demoResult = stageResults.find(r => r.stage_order === 4);
                  if (!demoResult) return null;
                  
                  return (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Overall Score */}
                      <div className={`p-4 rounded-lg border-2 ${demoResult.ai_score >= 80 ? 'bg-green-50 border-green-200' : demoResult.ai_score >= 65 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Demo Round Score</h4>
                            <div className={`text-3xl font-bold ${demoResult.ai_score >= 80 ? 'text-green-600' : demoResult.ai_score >= 65 ? 'text-amber-600' : 'text-red-600'}`}>
                              {demoResult.ai_score}%
                            </div>
                            <Badge variant={demoResult.passed ? 'default' : 'destructive'} className="mt-1">
                              {demoResult.passed ? '✓ Passed' : '✗ Below Threshold'}
                            </Badge>
                          </div>
                          <div className="flex-1 max-w-[200px] ml-6">
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${demoResult.ai_score >= 80 ? 'bg-green-500' : demoResult.ai_score >= 65 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${demoResult.ai_score}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Min: 65%</p>
                          </div>
                        </div>
                      </div>

                      {/* AI Feedback */}
                      {demoResult.ai_feedback && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-sm text-foreground">{demoResult.ai_feedback}</p>
                        </div>
                      )}

                      {/* Criteria Breakdown */}
                      {demoResult.question_scores && Object.keys(demoResult.question_scores).length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-muted-foreground">Criteria Breakdown</h4>
                          {Object.entries(demoResult.question_scores).map(([key, value]) => {
                            const labels: Record<string, string> = {
                              teachingClarity: 'Teaching Clarity',
                              subjectKnowledge: 'Subject Knowledge',
                              presentationSkills: 'Presentation Skills',
                              timeManagement: 'Time Management',
                              overallPotential: 'Overall Potential'
                            };
                            const scoreColor = value.score >= 80 ? 'text-green-600' : value.score >= 65 ? 'text-amber-600' : 'text-red-600';
                            const progressColor = value.score >= 80 ? 'bg-green-500' : value.score >= 65 ? 'bg-amber-500' : 'bg-red-500';
                            
                            return (
                              <div key={key} className="p-3 rounded-lg border bg-card">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">{labels[key] || key}</span>
                                  <span className={`text-sm font-bold ${scoreColor}`}>{value.score}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                                  <div className={`h-full ${progressColor}`} style={{ width: `${value.score}%` }} />
                                </div>
                                <p className="text-xs text-muted-foreground">{value.feedback}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Strengths & Improvements Grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {demoResult.strengths && demoResult.strengths.length > 0 && (
                          <div className="p-3 rounded-lg border border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                              <TrendingUp className="h-4 w-4" />
                              Strengths
                            </h4>
                            <ul className="space-y-2">
                              {demoResult.strengths.map((strength, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-foreground">{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {demoResult.improvements && demoResult.improvements.length > 0 && (
                          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                              <TrendingDown className="h-4 w-4" />
                              Areas to Improve
                            </h4>
                            <ul className="space-y-2">
                              {demoResult.improvements.map((improvement, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <Target className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-foreground">{improvement}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Acknowledge Button */}
                      <div className="flex justify-center pt-2">
                        <Button 
                          onClick={acknowledgeFeedbackAndProceed}
                          disabled={isAcknowledgingFeedback}
                          className="gap-2"
                          size="lg"
                        >
                          {isAcknowledgingFeedback ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          Acknowledge & Proceed to HR Documents
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Banner */}
      {currentSession.status === 'in_progress' && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-400">Tips for Success</h4>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                  <li>• Ensure stable internet connection and quiet environment</li>
                  <li>• Keep your camera and microphone ready for recording</li>
                  <li>• Take your time to answer thoughtfully</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slot Booking Modal */}
      <Dialog open={showSlotBooking} onOpenChange={setShowSlotBooking}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Book Demo Interview Slot
            </DialogTitle>
            <DialogDescription>
              Select a convenient time slot for your demo teaching session.
            </DialogDescription>
          </DialogHeader>
          
          {/* Quick Options */}
          <div className="space-y-2 pb-2 border-b">
            <h4 className="font-medium text-sm text-muted-foreground">Quick Options</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedSlot === 'immediately' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setSelectedSlot('immediately')}
              >
                <Play className="h-4 w-4 mr-2" />
                Immediately
              </Button>
              <Button
                variant={selectedSlot === 'next_10_min' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setSelectedSlot('next_10_min')}
              >
                <Clock className="h-4 w-4 mr-2" />
                In 10 Minutes
              </Button>
            </div>
          </div>
          
          <ScrollArea className="max-h-[300px] pr-4">
            <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot} className="space-y-2">
              {generateTimeSlots().reduce((groups: { [key: string]: { date: string; time: string; value: string }[] }, slot) => {
                if (!groups[slot.date]) groups[slot.date] = [];
                groups[slot.date].push(slot);
                return groups;
              }, {} as { [key: string]: { date: string; time: string; value: string }[] }) &&
              Object.entries(
                generateTimeSlots().reduce((groups: { [key: string]: { date: string; time: string; value: string }[] }, slot) => {
                  if (!groups[slot.date]) groups[slot.date] = [];
                  groups[slot.date].push(slot);
                  return groups;
                }, {} as { [key: string]: { date: string; time: string; value: string }[] })
              ).map(([date, slots]) => (
                <div key={date} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground pt-2">{date}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(slots as { date: string; time: string; value: string }[]).map((slot) => (
                      <div key={slot.value} className="flex items-center">
                        <RadioGroupItem value={slot.value} id={slot.value} className="peer sr-only" />
                        <Label
                          htmlFor={slot.value}
                          className="flex-1 text-center py-2 px-3 rounded-lg border cursor-pointer transition-all
                            peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 
                            peer-data-[state=checked]:text-primary hover:border-primary/50 text-sm"
                        >
                          {slot.time}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowSlotBooking(false)}>
              Cancel
            </Button>
            <Button 
              onClick={bookDemoSlot} 
              disabled={!selectedSlot || isBookingSlot}
              className="gap-2"
            >
              {isBookingSlot ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
