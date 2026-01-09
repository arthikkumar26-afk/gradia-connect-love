import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, AlertCircle, Video, Loader2, RefreshCw, Camera } from "lucide-react";

interface Question {
  question: string;
  options: string[];
}

interface Result {
  question: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  explanation: string;
  isCorrect: boolean;
}

const Interview = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [stageName, setStageName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Initialize interview
  const initInterview = useCallback(async () => {
    if (!token) {
      setError("Invalid interview link. Please use the link from your email.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('start-interview', {
        body: { token }
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || 'Failed to load interview');
      }

      setResponseId(data.responseId);
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(null));
      setCandidateName(data.candidateName);
      setJobTitle(data.jobTitle);
      setStageName(data.stageName);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    initInterview();
  }, [initInterview]);

  // Timer countdown
  useEffect(() => {
    if (!started || completed || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-move to next question
          handleNext();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, completed, currentIndex]);

  // Initialize webcam preview
  const initWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: true
      });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      toast.success("Camera ready");
    } catch (err) {
      console.error('Webcam error:', err);
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  };

  // Start combined screen + webcam recording
  const startRecording = async () => {
    try {
      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true
      });
      screenStreamRef.current = screenStream;

      // Get webcam stream if not already initialized
      if (!webcamStreamRef.current) {
        await initWebcam();
      }

      // Create a canvas to combine both streams
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d')!;

      // Create video elements for streams
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      await screenVideo.play();

      const webcamVideo = document.createElement('video');
      if (webcamStreamRef.current) {
        webcamVideo.srcObject = webcamStreamRef.current;
        webcamVideo.muted = true;
        await webcamVideo.play();
      }

      // Draw combined frame
      const drawFrame = () => {
        // Draw screen (full canvas)
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        
        // Draw webcam in bottom-right corner with border
        if (webcamStreamRef.current) {
          const webcamWidth = 320;
          const webcamHeight = 240;
          const padding = 20;
          const x = canvas.width - webcamWidth - padding;
          const y = canvas.height - webcamHeight - padding;
          
          // Draw border/shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(x - 4, y - 4, webcamWidth + 8, webcamHeight + 8);
          
          // Draw webcam feed
          ctx.drawImage(webcamVideo, x, y, webcamWidth, webcamHeight);
          
          // Draw border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, webcamWidth, webcamHeight);
        }
        
        if (isRecording) {
          requestAnimationFrame(drawFrame);
        }
      };

      // Start drawing
      setIsRecording(true);
      requestAnimationFrame(drawFrame);

      // Create combined stream from canvas
      const canvasStream = canvas.captureStream(30);
      
      // Add audio from webcam and screen
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      if (webcamStreamRef.current?.getAudioTracks().length) {
        const webcamAudio = audioContext.createMediaStreamSource(webcamStreamRef.current);
        webcamAudio.connect(destination);
      }
      
      if (screenStream.getAudioTracks().length) {
        const screenAudio = audioContext.createMediaStreamSource(screenStream);
        screenAudio.connect(destination);
      }

      // Combine video and audio
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        // Upload to storage
        if (responseId) {
          const fileName = `${responseId}/${Date.now()}.webm`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('interview-recordings')
            .upload(fileName, blob);

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('interview-recordings')
              .getPublicUrl(fileName);
            setRecordingUrl(publicUrl);
          }
        }
        // Stop all tracks
        screenStream.getTracks().forEach(track => track.stop());
        webcamStreamRef.current?.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      toast.success("Recording started (Screen + Camera)");
    } catch (err) {
      console.error('Recording error:', err);
      toast.error("Could not start recording. You can still proceed with the interview.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
  };

  const handleStart = async () => {
    startTimeRef.current = Date.now();
    await startRecording();
    setStarted(true);
    setTimeLeft(60);
  };

  const handleAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = index;
    setAnswers(newAnswers);
  };

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(60);
    }
  }, [currentIndex, questions.length]);

  const handleSubmit = async () => {
    setSubmitting(true);
    stopRecording();

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setTotalTime(timeTaken);

    // Wait for recording upload
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const { data, error: fnError } = await supabase.functions.invoke('submit-interview', {
        body: {
          responseId,
          answers: answers.map(a => a ?? -1),
          timeTaken,
          recordingUrl,
        }
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message);
      }

      setResults(data.results);
      setFinalScore(data.score);
      setCompleted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit interview");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Interview</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={initInterview} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Interview Completed!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for completing the {stageName} for {jobTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              The hiring team will review your submission and contact you with next steps.
            </p>
            <p className="text-xs text-muted-foreground mt-6">
              You can now close this window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome, {candidateName}!</CardTitle>
            <p className="text-muted-foreground mt-2">
              {stageName} Interview for <span className="font-semibold text-foreground">{jobTitle}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Webcam Preview */}
            <div className="relative">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {cameraReady ? (
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Camera preview will appear here</p>
                  </div>
                )}
              </div>
              {!cameraReady && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="absolute bottom-3 left-1/2 -translate-x-1/2"
                  onClick={initWebcam}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Enable Camera
                </Button>
              )}
              {cameraReady && (
                <Badge className="absolute top-2 right-2 bg-green-600">
                  <Camera className="h-3 w-3 mr-1" />
                  Camera Ready
                </Badge>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Interview Instructions:</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• You will be asked <strong>{questions.length} multiple choice questions</strong></li>
                <li>• Each question has a <strong>60 second time limit</strong></li>
                <li>• Your <strong>screen + camera</strong> will be recorded for verification</li>
                <li>• Select your answer and click Next to proceed</li>
                <li>• You cannot go back to previous questions</li>
                <li>• Your score will be shown immediately after completion</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg">
              <Video className="h-4 w-4 text-amber-600" />
              <span>You'll be prompted to share your screen and camera when you start</span>
            </div>

            <Button onClick={handleStart} className="w-full" size="lg" disabled={!cameraReady}>
              {cameraReady ? 'Start Interview' : 'Enable Camera First'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto relative">
        {/* Webcam Preview - Fixed bottom right */}
        {cameraReady && webcamStreamRef.current && (
          <div className="fixed bottom-4 right-4 z-50 rounded-lg overflow-hidden shadow-lg border-2 border-primary">
            <video
              ref={webcamVideoRef}
              autoPlay
              playsInline
              muted
              className="w-32 h-24 object-cover"
            />
            {isRecording && (
              <div className="absolute top-1 left-1">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
            <Progress value={progress} className="w-32 h-2 mt-1" />
          </div>
          <div className="flex items-center gap-2">
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse gap-1">
                <Camera className="h-3 w-3" />
                <Video className="h-3 w-3" />
                REC
              </Badge>
            )}
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${timeLeft <= 10 ? 'bg-red-100 text-red-700' : 'bg-muted'}`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-semibold">{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-6">{currentQuestion.question}</h2>

            <RadioGroup
              value={answers[currentIndex]?.toString()}
              onValueChange={(val) => handleAnswer(parseInt(val))}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, idx) => (
                <div
                  key={idx}
                  className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    answers[currentIndex] === idx
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleAnswer(idx)}
                >
                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-end mt-6">
              {currentIndex < questions.length - 1 ? (
                <Button onClick={handleNext} disabled={answers[currentIndex] === null}>
                  Next Question
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={answers[currentIndex] === null || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Interview'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Interview;
