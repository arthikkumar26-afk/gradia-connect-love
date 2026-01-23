import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Play, 
  Square, 
  ChevronRight, 
  Volume2,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: number;
  question: string;
  category: string;
  difficulty: string;
  expectedDuration: number;
  keyPoints: string[];
}

interface AITechnicalInterviewProps {
  sessionId: string;
  questions: Question[];
  onComplete: (answers: string[], recordings: string[]) => void;
  onCancel?: () => void;
}

export const AITechnicalInterview = ({
  sessionId,
  questions,
  onComplete,
  onCancel
}: AITechnicalInterviewProps) => {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPlayedCurrentQuestion, setHasPlayedCurrentQuestion] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Camera access denied:", error);
        toast({
          title: "Camera Access Required",
          description: "Please enable camera and microphone access for the interview.",
          variant: "destructive"
        });
      }
    };
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [toast]);

  // Play question using TTS
  const playQuestion = useCallback(async () => {
    if (!currentQuestion || isPlayingQuestion) return;

    setIsPlayingQuestion(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: currentQuestion.question }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const data = await response.json();
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      } else {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingQuestion(false);
        await audio.play();
      }
      
      setHasPlayedCurrentQuestion(true);
    } catch (error) {
      console.error("TTS error:", error);
      toast({
        title: "Audio Error",
        description: "Could not play question audio. Please read the question above.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsPlayingQuestion(false), 1000);
    }
  }, [currentQuestion, isPlayingQuestion, toast]);

  // Auto-play question when it changes
  useEffect(() => {
    if (currentQuestion && !hasPlayedCurrentQuestion) {
      const timeout = setTimeout(() => playQuestion(), 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentQuestionIndex]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!streamRef.current) {
      toast({
        title: "Camera Not Ready",
        description: "Please wait for camera to initialize.",
        variant: "destructive"
      });
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9,opus"
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordings(prev => [...prev, url]);
      
      // Upload to storage
      try {
        const fileName = `ai-interview/${sessionId}/q${currentQuestionIndex + 1}_${Date.now()}.webm`;
        const { error } = await supabase.storage
          .from("interview-recordings")
          .upload(fileName, blob);
        
        if (error) console.error("Upload error:", error);
      } catch (err) {
        console.error("Failed to upload recording:", err);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, [sessionId, currentQuestionIndex, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Next question
  const nextQuestion = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }

    // Save current answer placeholder
    setAnswers(prev => [...prev, `Answer recorded for question ${currentQuestionIndex + 1}`]);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setHasPlayedCurrentQuestion(false);
      setRecordingTime(0);
    } else {
      // Complete interview
      onComplete(answers, recordings);
    }
  }, [isRecording, stopRecording, currentQuestionIndex, questions.length, answers, recordings, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy": return "bg-green-500";
      case "medium": return "bg-yellow-500";
      case "hard": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Technical Interview</h1>
            <p className="text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <Button variant="outline" onClick={onCancel}>
            Exit Interview
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress: {Math.round(progress)}%</span>
            <span>Recording: {formatTime(recordingTime)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question Panel */}
          <Card className="lg:order-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {currentQuestionIndex + 1}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{currentQuestion?.category}</Badge>
                  <Badge className={getDifficultyColor(currentQuestion?.difficulty || "")}>
                    {currentQuestion?.difficulty}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-lg leading-relaxed">{currentQuestion?.question}</p>
              </div>

              <Button 
                onClick={playQuestion} 
                disabled={isPlayingQuestion}
                variant="outline"
                className="w-full"
              >
                {isPlayingQuestion ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Playing Question...
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Listen to Question
                  </>
                )}
              </Button>

              {currentQuestion?.keyPoints && currentQuestion.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Key points to cover:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {currentQuestion.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Expected duration: ~{Math.floor((currentQuestion?.expectedDuration || 120) / 60)} minutes
              </div>
            </CardContent>
          </Card>

          {/* Video Panel */}
          <Card className="lg:order-2">
            <CardHeader>
              <CardTitle className="text-lg">Your Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Preview */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">
                      REC {formatTime(recordingTime)}
                    </span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMic}
                  className={!isMicEnabled ? "bg-red-100 border-red-500" : ""}
                >
                  {isMicEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-500" />}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleVideo}
                  className={!isVideoEnabled ? "bg-red-100 border-red-500" : ""}
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-500" />}
                </Button>

                {!isRecording ? (
                  <Button 
                    onClick={startRecording} 
                    size="lg" 
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button 
                    onClick={stopRecording} 
                    size="lg" 
                    variant="destructive"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop Recording
                  </Button>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="ghost" disabled={currentQuestionIndex === 0}>
                  Previous
                </Button>
                <Button onClick={nextQuestion}>
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Complete Interview
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Navigator */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {questions.map((_, idx) => (
                <Button
                  key={idx}
                  variant={idx === currentQuestionIndex ? "default" : "outline"}
                  size="sm"
                  className={`min-w-10 ${
                    idx < currentQuestionIndex ? "bg-green-100 border-green-500 text-green-700" : ""
                  }`}
                  onClick={() => {
                    if (idx <= currentQuestionIndex) {
                      setCurrentQuestionIndex(idx);
                      setHasPlayedCurrentQuestion(false);
                    }
                  }}
                >
                  {idx < currentQuestionIndex ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={() => setIsPlayingQuestion(false)} />
    </div>
  );
};

export default AITechnicalInterview;
