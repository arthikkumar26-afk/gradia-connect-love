import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Timer, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Video, 
  AlertTriangle,
  Award,
  ArrowRight,
  ArrowLeft,
  Play,
  Camera
} from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: string;
}

interface MockTestSession {
  id: string;
  status: string;
  questions: Question[];
  answers: string[];
  score: number;
  total_questions: number;
  correct_answers: number;
  recording_url: string | null;
}

const MockTest = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<MockTestSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/candidate/login');
      return;
    }
    
    if (sessionId) {
      fetchSession();
    }
  }, [authLoading, isAuthenticated, sessionId]);

  // Timer effect
  useEffect(() => {
    if (testStarted && !testCompleted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleNextQuestion();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testStarted, testCompleted, currentQuestionIndex]);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      if (data.status === 'completed') {
        setShowResults(true);
        setTestCompleted(true);
      }

      setSession({
        ...data,
        questions: Array.isArray(data.questions) ? data.questions as unknown as Question[] : [],
        answers: Array.isArray(data.answers) ? data.answers as string[] : []
      });
      setAnswers(Array.isArray(data.answers) ? data.answers as string[] : []);
    } catch (error) {
      console.error('Error fetching session:', error);
      toast({
        title: "Error",
        description: "Could not load test session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
        audio: true
      });

      // Get webcam stream (front camera)
      const webcamStreamLocal = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", // Front camera
          width: { ideal: 320 },
          height: { ideal: 240 }
        },
        audio: false
      });

      setWebcamStream(webcamStreamLocal);

      // Set webcam video source
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = webcamStreamLocal;
        webcamVideoRef.current.play();
      }

      // Create canvas for combining streams
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Get screen video dimensions
      const screenTrack = screenStream.getVideoTracks()[0];
      const settings = screenTrack.getSettings();
      canvas.width = settings.width || 1920;
      canvas.height = settings.height || 1080;

      // Create video elements for streams
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      await screenVideo.play();

      const webcamVideo = document.createElement('video');
      webcamVideo.srcObject = webcamStreamLocal;
      webcamVideo.muted = true;
      await webcamVideo.play();

      // Draw combined video to canvas
      const drawFrame = () => {
        if (ctx && screenVideo.readyState >= 2) {
          // Draw screen
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          
          // Draw webcam in bottom-right corner (picture-in-picture)
          const pipWidth = 240;
          const pipHeight = 180;
          const margin = 20;
          
          // Add border/background for PiP
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(
            canvas.width - pipWidth - margin - 4,
            canvas.height - pipHeight - margin - 4,
            pipWidth + 8,
            pipHeight + 8
          );
          
          // Draw webcam video
          if (webcamVideo.readyState >= 2) {
            ctx.drawImage(
              webcamVideo,
              canvas.width - pipWidth - margin,
              canvas.height - pipHeight - margin,
              pipWidth,
              pipHeight
            );
          }
        }
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      // Create stream from canvas
      const canvasStream = canvas.captureStream(30);
      
      // Add audio from screen if available
      const audioTracks = screenStream.getAudioTracks();
      audioTracks.forEach(track => canvasStream.addTrack(track));

      // Create recorder
      const recorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          setRecordedChunks(prev => [...prev, e.data]);
        }
      };

      recorder.onstop = async () => {
        screenStream.getTracks().forEach(track => track.stop());
        webcamStreamLocal.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
        const blob = new Blob(chunks, { type: 'video/webm' });
        await uploadRecording(blob);
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      return true;
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Failed",
        description: "Could not start screen/camera recording. The test will continue without recording.",
        variant: "destructive"
      });
      return false;
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  const uploadRecording = async (blob: Blob) => {
    if (!user || !sessionId) return;

    try {
      const fileName = `${user.id}/${sessionId}/recording-${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('mock-test-recordings')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('mock-test-recordings')
        .getPublicUrl(fileName);

      await supabase
        .from('mock_test_sessions')
        .update({ recording_url: urlData.publicUrl })
        .eq('id', sessionId);

      toast({
        title: "Recording Saved",
        description: "Your test recording has been saved successfully."
      });
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const startTest = async () => {
    if (!session?.questions || session.questions.length === 0) {
      setGeneratingQuestions(true);
      try {
        // Get candidate profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single();

        // Generate questions
        const { data, error } = await supabase.functions.invoke('generate-mock-test', {
          body: { candidateProfile: profile, sessionId }
        });

        if (error) throw error;

        // Update session with questions
        await supabase
          .from('mock_test_sessions')
          .update({ 
            questions: data.questions,
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        setSession(prev => prev ? { ...prev, questions: data.questions, status: 'in_progress' } : null);
      } catch (error) {
        console.error('Error generating questions:', error);
        toast({
          title: "Error",
          description: "Could not generate test questions. Please try again.",
          variant: "destructive"
        });
        setGeneratingQuestions(false);
        return;
      }
      setGeneratingQuestions(false);
    }

    // Try to start screen recording
    await startRecording();
    
    setTestStarted(true);
    setTimeLeft(60);
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer || '';
    setAnswers(newAnswers);

    if (currentQuestionIndex < (session?.questions?.length || 10) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setTimeLeft(60);
    } else {
      completeTest(newAnswers);
    }
  };

  const completeTest = async (finalAnswers: string[]) => {
    setTestCompleted(true);
    stopRecording();

    if (!session) return;

    // Calculate score
    let correctCount = 0;
    session.questions.forEach((q, idx) => {
      const userAnswer = finalAnswers[idx]?.charAt(0);
      if (userAnswer === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = (correctCount / session.questions.length) * 100;

    try {
      await supabase
        .from('mock_test_sessions')
        .update({
          status: 'completed',
          answers: finalAnswers,
          correct_answers: correctCount,
          score: score,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      setSession(prev => prev ? {
        ...prev,
        status: 'completed',
        answers: finalAnswers,
        correct_answers: correctCount,
        score: score
      } : null);

      setShowResults(true);
    } catch (error) {
      console.error('Error completing test:', error);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showResults && session) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8">
            <div className="text-center mb-8">
              <Award className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Test Completed!</h1>
              <p className="text-muted-foreground">Here are your results</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-3xl font-bold text-primary">{session.score?.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{session.correct_answers}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{session.total_questions - (session.correct_answers || 0)}</p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>

            {/* Question Review */}
            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-foreground">Question Review</h3>
              {session.questions.map((q, idx) => {
                const userAnswer = session.answers?.[idx]?.charAt(0);
                const isCorrect = userAnswer === q.correctAnswer;
                return (
                  <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-red-500 bg-red-50 dark:bg-red-900/10'}`}>
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-2">{q.question}</p>
                        <p className="text-sm text-muted-foreground">
                          Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{session.answers?.[idx] || 'No answer'}</span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-green-600">Correct answer: {q.correctAnswer}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2 italic">{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {session.recording_url && (
              <div className="mb-8">
                <h3 className="font-semibold text-foreground mb-3">Test Recording</h3>
                <video 
                  src={session.recording_url} 
                  controls 
                  className="w-full rounded-lg"
                />
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/candidate/dashboard')}>
                Back to Dashboard
              </Button>
              <Button variant="cta" onClick={() => navigate('/candidate/interview-prep')}>
                Practice More
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Play className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Mock Interview Test</h1>
              <p className="text-muted-foreground">Prepare yourself before starting</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-foreground mb-4">📋 Test Instructions</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">•</span>
                  You will answer <strong>10 multiple choice questions</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">•</span>
                  Each question has <strong>60 seconds</strong> time limit
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">•</span>
                  Your <strong>screen and webcam</strong> will be recorded during the test
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">•</span>
                  Questions are based on your <strong>profile and expertise</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">•</span>
                  You can review your answers <strong>after completing</strong> the test
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Screen & Camera Recording Required</p>
                  <p className="text-sm text-muted-foreground">
                    Please allow screen recording and camera access when prompted. Your screen and webcam will be recorded to verify test integrity.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              variant="cta" 
              size="lg" 
              className="w-full gap-2"
              onClick={startTest}
              disabled={generatingQuestions}
            >
              {generatingQuestions ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Start Test
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = session?.questions?.[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      {/* Hidden canvas for combining streams */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Webcam preview (visible in corner during test) */}
      {isRecording && webcamStream && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg overflow-hidden border-2 border-primary shadow-lg">
          <video
            ref={webcamVideoRef}
            autoPlay
            muted
            playsInline
            className="w-40 h-30 object-cover"
          />
        </div>
      )}
      
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              Question {currentQuestionIndex + 1} of {session?.questions?.length || 10}
            </Badge>
            {isRecording && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <Video className="h-3 w-3" />
                Recording
              </Badge>
            )}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${timeLeft <= 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-muted'}`}>
            <Timer className="h-4 w-4" />
            <span className="font-mono font-bold">{timeLeft}s</span>
          </div>
        </div>

        {/* Progress */}
        <Progress value={((currentQuestionIndex + 1) / (session?.questions?.length || 10)) * 100} className="mb-6" />

        {/* Question Card */}
        <Card className="p-8">
          {currentQuestion && (
            <>
              <Badge variant="secondary" className="mb-4">{currentQuestion.category}</Badge>
              <h2 className="text-xl font-semibold text-foreground mb-6">{currentQuestion.question}</h2>

              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedAnswer === option
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  disabled={currentQuestionIndex === 0}
                  onClick={() => {
                    setCurrentQuestionIndex(prev => prev - 1);
                    setSelectedAnswer(answers[currentQuestionIndex - 1] || null);
                    setTimeLeft(60);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button 
                  variant="cta"
                  onClick={handleNextQuestion}
                >
                  {currentQuestionIndex === (session?.questions?.length || 10) - 1 ? 'Submit Test' : 'Next'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MockTest;
