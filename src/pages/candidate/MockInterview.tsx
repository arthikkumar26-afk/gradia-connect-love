import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { interviewPipelineConfig } from "@/data/interviewPipelineConfig";
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
  ArrowLeft,
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
  MapPin,
  Code,
  Terminal,
  Download
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
  type: 'text' | 'multiple_choice' | 'scenario' | 'coding';
  options?: string[];
  expectedPoints?: string[];
  category: string;
  functionSignature?: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  constraints?: string[];
  starterCode?: string;
  testCases?: Array<{ input: string; output: string; expectedOutput?: string }>;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
}

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  questionCount: number;
  timePerQuestion: number;
  passingScore: number;
  stageType?: 'email_info' | 'assessment' | 'slot_booking' | 'demo' | 'feedback' | 'hr_documents' | 'review' | 'coding';
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
  const [runResults, setRunResults] = useState<{ status: 'idle' | 'running' | 'success' | 'error' | 'partial'; results: Array<{ input: string; expected: string; actual: string; passed: boolean }>; error?: string } | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);
  const [allStageResults, setAllStageResults] = useState<any[]>([]);
  const [sessionData, setSessionData] = useState<any>(null);
  const [currentInterviewType, setCurrentInterviewType] = useState<string>('');
  
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
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

      // Get default stages from edge function (education fallback)
      const { data: stagesData } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: { action: 'get_stages' }
      });
      let resolvedStages: InterviewStage[] = (stagesData?.stages || []).filter(
        (s: InterviewStage) => !s.name.toLowerCase().includes('slot booking')
      );

      // Try to get session first to resolve pipeline-specific stages
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

      // Override stages from pipeline config if session has interview_type & pipeline_type
      const sessInterviewType = (fetchedSessionData as any).interview_type || localStorage.getItem('mock_interview_type') || '';
      const sessPipelineType = (fetchedSessionData as any).pipeline_type || localStorage.getItem('mock_pipeline_type') || '';
      setCurrentInterviewType(sessInterviewType);

      // Roles that should skip coding stages (must match MockInterviewTab)
      const NON_CODING_BUSINESS_ROLES = [
        'business_analyst', 'it_business_analyst', 'functional_consultant',
        'erp_consultant', 'crm_consultant', 'it_consultant',
        'solution_architect', 'pre_sales_consultant',
      ];
      if (sessInterviewType && sessPipelineType) {
        const sessRole = (fetchedSessionData as any)?.role || localStorage.getItem('mock_role') || '';
        const removeCodingLoad = NON_CODING_BUSINESS_ROLES.includes(sessRole);
        const configStages = (interviewPipelineConfig
          .find(t => t.value === sessInterviewType)
          ?.pipelineTypes.find(pt => pt.value === sessPipelineType)
          ?.stages || []).filter(s => {
            const n = s.name.toLowerCase();
            return n !== 'offer stage'
              && !n.includes('slot booking')
              && !n.includes('cv')
              && !n.includes('resume')
              && (!removeCodingLoad || !n.includes('coding'));
          });
        if (configStages.length > 0) {
          resolvedStages = configStages.map((s, idx) => ({
            name: s.name,
            order: idx + 1,
            description: s.description || '',
            questionCount: s.name.toLowerCase().includes('coding') ? 1 : s.name.toLowerCase().includes('technical interview') ? 20 : s.name.toLowerCase().includes('mcq') || s.name.toLowerCase().includes('written') || s.name.toLowerCase().includes('assessment') ? 10 : 1,
            timePerQuestion: s.name.toLowerCase().includes('coding') ? 1800 : s.name.toLowerCase().includes('technical interview') ? 120 : s.name.toLowerCase().includes('demo') ? 600 : 90,
            passingScore: 65,
            stageType: s.name.toLowerCase().includes('slot booking') ? 'slot_booking' as const
              : s.name.toLowerCase().includes('coding test') && !s.name.toLowerCase().includes('slot') ? 'coding' as const
              : s.name.toLowerCase().includes('coding result') ? 'feedback' as const
              : s.name.toLowerCase().includes('demo') ? 'demo' as const
              : s.name.toLowerCase().includes('feedback') ? 'feedback' as const
              : s.name.toLowerCase().includes('hr') ? 'hr_documents' as const
              : (s.name.toLowerCase() === 'final review' || s.name.toLowerCase() === 'offer stage') ? 'review' as const
              : s.name.toLowerCase().includes('instruction') || s.name.toLowerCase().includes('cv') || s.name.toLowerCase().includes('resume') ? 'email_info' as const
              : 'assessment' as const,
          }));
        }
      }

      setStages(resolvedStages);
      const currentStage = resolvedStages.find((s: InterviewStage) => s.order === parseInt(stageOrder || '1'));
      setStage(currentStage || null);

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      setProfile(profileData);

      // Session already fetched above

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

  const runCode = async () => {
    if (!currentAnswer.trim()) {
      toast.error("Please write some code first");
      return;
    }
    const currentQuestion = questions[currentQuestionIndex];
    const testCases = currentQuestion.testCases || currentQuestion.examples?.map(ex => ({ input: ex.input, output: ex.output, expectedOutput: ex.output })) || [];
    
    setRunResults({ status: 'running', results: [] });
    setShowTestResults(true);

    // Small delay for UX
    await new Promise(r => setTimeout(r, 500));

    if (testCases.length === 0) {
      // No test cases: just check syntax
      try {
        new Function(currentAnswer);
        setRunResults({ status: 'success', results: [{ input: 'Syntax Check', expected: 'No errors', actual: 'No errors', passed: true }] });
      } catch (err: any) {
        setRunResults({ status: 'error', results: [], error: err.message });
      }
      return;
    }

    try {
      // Try to extract function name from code
      const fnMatch = currentAnswer.match(/function\s+(\w+)/);
      if (!fnMatch) {
        // Check for arrow function: const name = ...
        const arrowMatch = currentAnswer.match(/(?:const|let|var)\s+(\w+)\s*=/);
        if (!arrowMatch) {
          setRunResults({ status: 'error', results: [], error: "Could not find a function definition. Define your solution as a named function." });
          return;
        }
      }

      const results: Array<{ input: string; expected: string; actual: string; passed: boolean }> = [];
      let hasError = false;

      for (const tc of testCases) {
        try {
          // Create isolated execution
          const wrappedCode = `${currentAnswer}\n\n// Return result\nreturn typeof ${fnMatch?.[1] || currentAnswer.match(/(?:const|let|var)\s+(\w+)/)?.[1]} === 'function' ? ${fnMatch?.[1] || currentAnswer.match(/(?:const|let|var)\s+(\w+)/)?.[1]}(${tc.input}) : undefined;`;
          const fn = new Function(wrappedCode);
          const result = fn();
          const expected = tc.expectedOutput || tc.output;
          const actual = JSON.stringify(result);
          const passed = actual === expected || String(result) === String(expected);
          results.push({ input: tc.input, expected, actual: actual ?? 'undefined', passed });
        } catch (err: any) {
          results.push({ input: tc.input, expected: tc.expectedOutput || tc.output, actual: `Error: ${err.message}`, passed: false });
          hasError = true;
        }
      }

      const allPassed = results.every(r => r.passed);
      setRunResults({ status: hasError ? 'error' : allPassed ? 'success' : 'partial', results, error: hasError ? 'Some test cases failed with errors' : undefined });
    } catch (err: any) {
      setRunResults({ status: 'error', results: [], error: `Compilation error: ${err.message}` });
    }
  };

  const startInterview = async () => {
    const isCodingStage = stage?.stageType === 'coding' || stage?.name?.toLowerCase().includes('coding test');
    const isDemoStage = stage?.stageType === 'demo' || stage?.name?.toLowerCase().includes('demo');
    const isEducationType = currentInterviewType === 'education';
    // Camera/mic is REQUIRED only for demo stages in education pipeline
    // For all other stages (MCQ assessments, coding, technical tests), camera is optional
    const requiresCamera = isDemoStage || (isEducationType && stage?.stageType === 'assessment');
    let canRecord = false;

    if (requiresCamera) {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;
      canRecord = true;
    } else {
      // Non-required: camera/mic is optional, never block the user
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionsGranted(true);
        canRecord = true;
      } catch {
        console.log('[MockInterview] Camera/mic not available - proceeding without');
        canRecord = false;
      }
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'generate_questions',
          sessionId,
          stageOrder: parseInt(stageOrder || '1'),
          candidateProfile: profile,
          stageType: stage?.stageType || 'assessment',
          stageName: stage?.name || `Stage ${stageOrder}`
        }
      });

      if (error) throw error;

      if (data?.questions) {
        setQuestions(data.questions);
        setTimeLeft(data.timePerQuestion || 120);
        // Initialize code editor with starter code for coding questions
        if (data.questions[0]?.starterCode) {
          setCurrentAnswer(data.questions[0].starterCode);
        }
        setIsStarted(true);
        
        // Only auto-start recording if camera/mic available
        if (canRecord) {
          setTimeout(() => {
            startRecording();
          }, 500);
        }
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
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      // Load starter code for next coding problem, or empty for text questions
      setCurrentAnswer(questions[nextIdx]?.starterCode || "");
      setRunResults(null);
      setShowTestResults(false);
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

      // Only send email if shouldSendEmail is true (not for slot booking, feedback, or results stages)
      const nextStageName = (data.nextStage?.name || '').toLowerCase();
      const isResultsOrFeedbackStage = nextStageName.includes('results') || nextStageName.includes('feedback');
      if (!data.isComplete && data.nextStage && data.shouldSendEmail && !isResultsOrFeedbackStage) {
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
      } else if (isResultsOrFeedbackStage) {
        const passedText = data.evaluation.passed ? '🎉 You passed!' : '📝 Stage completed.';
        toast.success(`${passedText} View your results below.`);
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
    navigate('/candidate/dashboard?tab=mocktest');
  };

  const downloadFinalReviewPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const logoModule = await import('@/assets/gradia-logo.png');
      const logoUrl = (logoModule as any).default || logoModule;

      // Load logo as data URL
      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = logoUrl as string;
      }).catch(() => '');

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = 40;

      // Header with logo
      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, 'PNG', margin, y, 90, 30); } catch {}
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Mock Interview - Final Report', pageW - margin, y + 20, { align: 'right' });
      y += 50;
      doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(`Candidate: ${profile?.full_name || ''}`, margin, y); y += 14;
      doc.text(`Email: ${profile?.email || ''}`, margin, y); y += 14;
      doc.text(`Date: ${new Date().toLocaleString()}`, margin, y); y += 20;
      doc.setTextColor(0);

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - 40) { doc.addPage(); y = 50; }
      };

      const writeWrapped = (text: string, x: number, maxW: number, lh = 14) => {
        const lines = doc.splitTextToSize(text || '', maxW);
        lines.forEach((ln: string) => {
          ensureSpace(lh);
          doc.text(ln, x, y);
          y += lh;
        });
      };

      stages.filter(s => s.order < 7).forEach((s) => {
        const r: any = allStageResults.find((x: any) => x.stage_order === s.order);
        ensureSpace(60);
        doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 16;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        doc.text(`${s.order}. ${s.name}`, margin, y); y += 16;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        const score = r?.ai_score ?? null;
        const passed = r?.passed ?? false;
        doc.text(`Status: ${r ? (passed ? 'Passed' : 'Completed') : 'Completed'}${score !== null ? `   |   Score: ${score}/100` : ''}`, margin, y);
        y += 16;
        if (r?.ai_feedback) {
          doc.setFont('helvetica', 'bold'); doc.text('Feedback:', margin, y); y += 14;
          doc.setFont('helvetica', 'normal');
          writeWrapped(r.ai_feedback, margin, pageW - margin * 2);
          y += 4;
        }
        const strengths: string[] = (r?.strengths as string[]) || [];
        if (strengths.length) {
          doc.setFont('helvetica', 'bold'); doc.text('Strengths:', margin, y); y += 14;
          doc.setFont('helvetica', 'normal');
          strengths.forEach(t => writeWrapped(`• ${t}`, margin + 10, pageW - margin * 2 - 10));
          y += 4;
        }
        const improvements: string[] = (r?.improvements as string[]) || [];
        if (improvements.length) {
          doc.setFont('helvetica', 'bold'); doc.text('Areas to Improve:', margin, y); y += 14;
          doc.setFont('helvetica', 'normal');
          improvements.forEach(t => writeWrapped(`• ${t}`, margin + 10, pageW - margin * 2 - 10));
          y += 4;
        }

        // Questions & Answers
        const qs: any[] = (r?.questions as any[]) || [];
        const ans: any[] = (r?.answers as any[]) || [];
        const qScores: any[] = (r?.question_scores as any[]) || [];
        if (qs.length) {
          ensureSpace(20);
          doc.setFont('helvetica', 'bold'); doc.text('Questions & Answers:', margin, y); y += 14;
          qs.forEach((q: any, i: number) => {
            const qText = typeof q === 'string' ? q : (q?.question || '');
            const aRaw = ans[i];
            const aText = typeof aRaw === 'string' ? aRaw : (aRaw?.answer ?? aRaw?.code ?? JSON.stringify(aRaw ?? ''));
            const sc = qScores.find((x: any) => x?.questionId === (q?.id ?? i + 1));
            ensureSpace(30);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
            writeWrapped(`Q${i + 1}. ${qText}`, margin, pageW - margin * 2);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
            writeWrapped(`Answer: ${aText || '(no answer)'}`, margin + 10, pageW - margin * 2 - 10);
            doc.setTextColor(0);
            if (sc) {
              doc.setTextColor(90); doc.setFontSize(10);
              writeWrapped(`Score: ${sc.score ?? '-'}/100${sc.feedback ? ` — ${sc.feedback}` : ''}`, margin + 10, pageW - margin * 2 - 10, 12);
              doc.setTextColor(0); doc.setFontSize(11);
            }
            y += 4;
          });
        }
        y += 8;
      });

      doc.save(`mock-interview-report-${sessionId || 'session'}.pdf`);
      toast.success('Report downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate report');
    }
  };



  const retryStage = async () => {
    try {
      setIsLoading(true);
      const currentStageOrder = parseInt(stageOrder || '1');
      
      // Delete the existing result for this stage
      const { error: deleteError } = await supabase
        .from('mock_interview_stage_results')
        .delete()
        .eq('session_id', sessionId)
        .eq('stage_order', currentStageOrder);

      if (deleteError) throw deleteError;

      // Reset the session's current_stage_order back to this stage
      const { error: updateError } = await supabase
        .from('mock_interview_sessions')
        .update({ 
          current_stage_order: currentStageOrder,
          status: 'in_progress'
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Reset local state
      setShowResult(false);
      setEvaluation(null);
      setQuestions([]);
      setAnswers([]);
      setCurrentAnswer("");
      setCurrentQuestionIndex(0);
      setIsStarted(false);
      setStageRecordingUrl(null);
      setRecordingDuration(0);
      resetRecording();

      toast.success("Stage reset! You can start again.");
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error retrying stage:', error);
      toast.error("Failed to retry stage. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToDashboard}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mock Test Stages
            </Button>
          </div>
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
          <div className="mt-6 flex items-center justify-center gap-4">
            {!evaluation.passed && (
              <Button onClick={retryStage} variant="default" className="gap-2">
                <Play className="h-4 w-4" />
                Retry Stage
              </Button>
            )}
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
    const isCodingQuestion = currentQuestion.type === 'coding' || stage?.stageType === 'coding';

    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className={`mx-auto space-y-4 ${isCodingQuestion ? 'max-w-7xl' : 'max-w-6xl'}`}>
          {/* Header */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {isCodingQuestion ? <Code className="h-6 w-6 text-primary" /> : <Brain className="h-6 w-6 text-primary" />}
                  <div>
                    <h3 className="font-semibold">{stage?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {isCodingQuestion ? `Problem ${currentQuestionIndex + 1} of ${questions.length}` : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {currentQuestion.difficulty && (
                    <Badge variant={currentQuestion.difficulty === 'easy' ? 'secondary' : currentQuestion.difficulty === 'medium' ? 'default' : 'destructive'}>
                      {currentQuestion.difficulty.toUpperCase()}
                    </Badge>
                  )}
                  {isRecording && (
                    <Badge variant="destructive" className={`flex items-center gap-1.5 ${isPaused ? 'bg-amber-500' : 'animate-pulse'}`}>
                      <Circle className="h-2 w-2 fill-current" />
                      {isPaused ? 'PAUSED' : 'REC'} {formatTime(recordingDuration)}
                    </Badge>
                  )}
                  <div className={`flex items-center gap-2 ${timeLeft <= 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <Timer className="h-5 w-5" />
                    <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                  </div>
                </div>
              </div>
              <Progress value={progress} className="mt-4" />
            </CardContent>
          </Card>

          {isCodingQuestion ? (
            /* Coding Problem Layout */
            <div className="grid lg:grid-cols-2 gap-4 h-[calc(100vh-220px)]">
              {/* Left: Problem Description */}
              <Card className="overflow-auto">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{currentQuestion.category}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Problem Statement */}
                  <div>
                    <h4 className="font-semibold text-base mb-2">Problem Statement</h4>
                    <p className="text-foreground leading-relaxed">{currentQuestion.question}</p>
                  </div>

                  {/* Function Signature */}
                  {currentQuestion.functionSignature && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Function Signature</h4>
                      <pre className="bg-muted rounded-md p-3 text-sm font-mono overflow-x-auto">
                        {currentQuestion.functionSignature}
                      </pre>
                    </div>
                  )}

                  {/* Examples */}
                  {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Examples</h4>
                      <div className="space-y-3">
                        {currentQuestion.examples.map((ex, idx) => (
                          <div key={idx} className="bg-muted/50 rounded-md p-3 space-y-1">
                            <p className="text-sm font-mono"><span className="font-semibold">Input:</span> {ex.input}</p>
                            <p className="text-sm font-mono"><span className="font-semibold">Output:</span> {ex.output}</p>
                            {ex.explanation && (
                              <p className="text-sm text-muted-foreground"><span className="font-semibold">Explanation:</span> {ex.explanation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Constraints</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {currentQuestion.constraints.map((c, idx) => (
                          <li key={idx} className="font-mono text-muted-foreground">{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right: Code Editor */}
              <div className="flex flex-col gap-4">
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Code Editor
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">
                        {currentQuestion.language || 'JavaScript'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col pb-4">
                    <textarea
                      value={currentAnswer || currentQuestion.starterCode || ''}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      className="flex-1 w-full font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] rounded-md p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary border border-border"
                      style={{ minHeight: '300px', tabSize: 2 }}
                      spellCheck={false}
                      placeholder="// Write your code here..."
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const start = e.currentTarget.selectionStart;
                          const end = e.currentTarget.selectionEnd;
                          const value = e.currentTarget.value;
                          setCurrentAnswer(value.substring(0, start) + '  ' + value.substring(end));
                          setTimeout(() => {
                            e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                          }, 0);
                        }
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Action Bar: Run Code + Submit */}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {currentQuestionIndex < questions.length - 1 
                      ? `${questions.length - currentQuestionIndex - 1} problem(s) remaining`
                      : 'This is the last problem'}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline"
                      onClick={runCode} 
                      disabled={!currentAnswer.trim() || runResults?.status === 'running'}
                      className="gap-2"
                      size="lg"
                    >
                      {runResults?.status === 'running' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Run Code
                    </Button>
                    <Button 
                      onClick={handleNextQuestion} 
                      disabled={!currentAnswer.trim()}
                      className="gap-2"
                      size="lg"
                    >
                      {currentQuestionIndex < questions.length - 1 ? (
                        <>
                          Next Problem
                          <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Submit Code
                          <CheckCircle2 className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Test Results Panel */}
                {showTestResults && runResults && (
                  <Card className="border-t-2 border-primary/30">
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          Test Results
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowTestResults(false)} className="h-6 px-2 text-xs">
                          Hide
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {runResults.status === 'running' && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running test cases...
                        </div>
                      )}

                      {runResults.error && (
                        <div className="space-y-2">
                          <p className="text-destructive font-semibold text-sm">
                            {runResults.status === 'error' && runResults.results.length === 0 ? 'Compilation error' : 'Runtime error'}
                          </p>
                          <div className="bg-muted rounded-md p-3">
                            <p className="font-semibold text-sm">Compiler Message</p>
                            <pre className="text-sm font-mono text-destructive mt-1 whitespace-pre-wrap">{runResults.error}</pre>
                          </div>
                        </div>
                      )}

                      {runResults.results.length > 0 && (
                        <div className="space-y-2">
                          {runResults.results.map((r, idx) => (
                            <div key={idx} className={`rounded-md p-3 border ${r.passed ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                {r.passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <span className={`text-sm font-semibold ${r.passed ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                  Case {idx + 1}: {r.passed ? 'Passed' : 'Failed'}
                                </span>
                              </div>
                              <div className="text-xs font-mono space-y-1 ml-6">
                                <p><span className="text-muted-foreground">Input:</span> {r.input}</p>
                                <p><span className="text-muted-foreground">Expected:</span> {r.expected}</p>
                                {!r.passed && <p><span className="text-muted-foreground">Output:</span> {r.actual}</p>}
                              </div>
                            </div>
                          ))}
                          <div className="text-sm text-muted-foreground pt-1">
                            {runResults.results.filter(r => r.passed).length}/{runResults.results.length} test cases passed
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            /* Original Non-Coding Layout */
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
          )}
        </div>
      </div>
    );
  }

  // Helper function for slot booking
  const handleSlotBooking = async () => {
    // For non-education types, construct slot from date/time form fields
    const slotValue = selectedSlot || (slotBookingForm.date && slotBookingForm.time 
      ? `${new Date(slotBookingForm.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at ${slotBookingForm.time}`
      : '');
    
    if (!slotValue) {
      toast.error("Please select a time slot");
      return;
    }
    
    setIsBookingSlot(true);
    try {
      const currentStageOrder = parseInt(stageOrder || '3');
      const { data, error } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: {
          action: 'book_slot',
          sessionId,
          stageOrder: currentStageOrder,
          bookedSlot: slotValue
        }
      });

      if (error) throw error;

      // Determine the next stage details from pipeline config
      const nextStageOrder = currentStageOrder + 1;
      const nextStage = stages.find(s => s.order === nextStageOrder);
      const isEducationType = currentInterviewType === 'education';
      
      // Only send Demo Round email for education types
      if (isEducationType) {
        const { error: emailError } = await supabase.functions.invoke('send-mock-interview-invitation', {
          body: {
            candidateEmail: profile?.email,
            candidateName: profile?.full_name || 'Candidate',
            sessionId,
            stageOrder: nextStageOrder,
            stageName: 'Demo Round',
            stageDescription: 'Live teaching demonstration where AI evaluates your teaching clarity, subject knowledge, and presentation skills.',
            appUrl: window.location.origin,
            bookedSlot: slotValue
          }
        });

        if (emailError) {
          console.error('Email error:', emailError);
        }
      } else if (nextStage) {
        // For non-education types, send invitation for the actual next stage (e.g., Technical Test)
        const { error: emailError } = await supabase.functions.invoke('send-mock-interview-invitation', {
          body: {
            candidateEmail: profile?.email,
            candidateName: profile?.full_name || 'Candidate',
            sessionId,
            stageOrder: nextStageOrder,
            stageName: nextStage.name,
            stageDescription: nextStage.description || 'Your next assessment stage is ready.',
            appUrl: window.location.origin,
            bookedSlot: slotValue
          }
        });

        if (emailError) {
          console.error('Email error:', emailError);
        }
      }

      toast.success(`Slot booked for ${slotValue}! Check your email for details.`);
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

    // Slot Booking stages (use stageType, not hardcoded order)
    if (stage.stageType === 'slot_booking') {
      const timeSlots = generateTimeSlots();
      const states = Object.keys(indiaLocationData);
      const districts = slotBookingForm.state ? Object.keys(indiaLocationData[slotBookingForm.state] || {}) : [];
      
      const programmeOptions = ['State Syllabus', 'CBSE Syllabus', 'Techno Programme', 'Olympiad'];
      const segmentOptions = ['Pre-Primary', 'Primary', 'Middle School-6/7/8', 'High School-9 & 10'];
      const departmentOptions = ['Telugu', 'Hindi', 'English', 'Math', 'Science', 'Social', 'Computer'];
      const designationOptions = ['Asso.Teacher', 'Teacher', 'Vice-Principal', 'Principal', 'Zonal Co', 'R&D Head', 'SME'];
      const classOptions = ['Nursery', 'PP-1 & PP-2', 'C-1 & C-2', 'C-3, C-4 & C-5', 'C-6, C-7 & C-8', 'C-9 & C-10'];
      
      const isEducationType = currentInterviewType === 'education';
      
      const isStage2FormValid = stage.order === 2 
        ? isEducationType
          ? slotBookingForm.date && slotBookingForm.time && slotBookingForm.state && slotBookingForm.district && 
            slotBookingForm.programme && slotBookingForm.segment && slotBookingForm.department && 
            slotBookingForm.designation && slotBookingForm.classLevel
          : slotBookingForm.date && slotBookingForm.time
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

                    {/* Location & Education Details - only for education interviews */}
                    {isEducationType && (
                      <>
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
                      </>
                    )}

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

    // Demo Feedback stage (use stageType, not hardcoded order)
    if (stage.stageType === 'feedback') {
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

    // All Reviews stage (use stageType, not hardcoded order)
    if (stage.stageType === 'review') {
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
                <div className="flex justify-end">
                  <Button onClick={downloadFinalReviewPdf} variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Full Report (PDF)
                  </Button>
                </div>

                <div className="grid gap-4">
                  {stages.filter(s => s.order < 7).map((s) => {
                    const r = allStageResults.find((x: any) => x.stage_order === s.order);
                    const score = r?.ai_score ?? null;
                    const passed = r?.passed ?? false;
                    const feedback = r?.ai_feedback || '';
                    const strengths: string[] = (r?.strengths as string[]) || [];
                    const improvements: string[] = (r?.improvements as string[]) || [];
                    return (
                      <div key={s.order} className="border rounded-lg p-4 bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="font-semibold">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {score !== null && (
                              <Badge variant={passed ? 'default' : 'secondary'}>
                                Score: {score}/100
                              </Badge>
                            )}
                            <Badge variant={passed ? 'default' : 'outline'}>
                              {passed ? 'Passed' : (r ? 'Completed' : 'Completed')}
                            </Badge>
                          </div>
                        </div>
                        {feedback && (
                          <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{feedback}</p>
                        )}
                        {(strengths.length > 0 || improvements.length > 0) && (
                          <div className="grid md:grid-cols-2 gap-3 mt-2">
                            {strengths.length > 0 && (
                              <div className="bg-green-50 dark:bg-green-900/10 rounded p-3">
                                <h5 className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 uppercase tracking-wide">Strengths</h5>
                                <ul className="text-sm space-y-1 list-disc list-inside text-foreground">
                                  {strengths.map((t, i) => <li key={i}>{t}</li>)}
                                </ul>
                              </div>
                            )}
                            {improvements.length > 0 && (
                              <div className="bg-amber-50 dark:bg-amber-900/10 rounded p-3">
                                <h5 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-wide">Areas to Improve</h5>
                                <ul className="text-sm space-y-1 list-disc list-inside text-foreground">
                                  {improvements.map((t, i) => <li key={i}>{t}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={downloadFinalReviewPdf} variant="outline" className="w-full gap-2" size="lg">
                    <Download className="h-5 w-5" />
                    Download Report
                  </Button>
                  <Button onClick={goToDashboard} className="w-full" size="lg">
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Coding Test stage
    if (stage.stageType === 'coding' || stage?.name?.toLowerCase().includes('coding test')) {
      return (
        <div className="min-h-screen bg-background p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <ProgressTrackerSection />
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{stage?.name || 'Coding Test'}</CardTitle>
                <CardDescription className="text-base mt-2">
                  {stage?.description || 'Write code & submit your solution for AI evaluation'}
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
                      Camera access will be required for proctoring
                    </li>
                    <li className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Microphone access will be required
                    </li>
                    <li className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      {stage?.questionCount || 1} coding problem(s), {Math.round((stage?.timePerQuestion || 1800) / 60)} minutes total
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
                    Start Coding Test
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

    // Default: Assessment stages (Technical Assessment, HR Round, etc.)
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
