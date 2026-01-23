import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  PhoneOff,
  Brain,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  User,
  Bot
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

interface TranscriptMessage {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: Date;
}

interface AIInterviewAgentProps {
  sessionId: string;
  questions: Question[];
  jobTitle: string;
  candidateName: string;
  onComplete: (transcript: TranscriptMessage[], recordings: string[]) => void;
  onCancel?: () => void;
}

export const AIInterviewAgent = ({
  sessionId,
  questions,
  jobTitle,
  candidateName,
  onComplete,
  onCancel
}: AIInterviewAgentProps) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [interviewDuration, setInterviewDuration] = useState(0);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Build dynamic system prompt for the AI agent
  const buildSystemPrompt = useCallback(() => {
    const questionList = questions.map((q, i) => 
      `Question ${i + 1} (${q.category} - ${q.difficulty}): ${q.question}`
    ).join('\n');

    return `You are a professional technical interviewer conducting an interview for the position of ${jobTitle}. The candidate's name is ${candidateName}.

Your role is to:
1. Ask technical interview questions one by one
2. Listen carefully to the candidate's answers
3. Provide brief acknowledgments after each answer
4. Move to the next question naturally
5. Be professional, encouraging, and maintain a conversational tone

Here are the questions you should ask in order:
${questionList}

Start by introducing yourself briefly and then ask the first question. After each response, acknowledge it and move to the next question. When all questions are answered, thank the candidate and end the interview professionally.

Current question to focus on: Question ${currentQuestionIndex + 1}`;
  }, [questions, jobTitle, candidateName, currentQuestionIndex]);

  // ElevenLabs Conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to AI interviewer");
      setIsInterviewActive(true);
      addToTranscript("interviewer", `Hello ${candidateName}! I'm your AI interviewer for the ${jobTitle} position. Let's begin with the first question.`);
    },
    onDisconnect: () => {
      console.log("Disconnected from AI interviewer");
      setIsInterviewActive(false);
    },
    onMessage: (message: any) => {
      console.log("Message received:", message);
      
      // Handle different message types
      if (message?.type === "user_transcript" && message?.user_transcription_event?.user_transcript) {
        const userText = message.user_transcription_event.user_transcript;
        addToTranscript("candidate", userText);
      }
      
      if (message?.type === "agent_response" && message?.agent_response_event?.agent_response) {
        const agentText = message.agent_response_event.agent_response;
        addToTranscript("interviewer", agentText);
        
        // Check if agent asked the next question
        const nextQIndex = questions.findIndex((q, i) => 
          i > currentQuestionIndex && agentText.toLowerCase().includes(q.question.toLowerCase().substring(0, 30))
        );
        if (nextQIndex > currentQuestionIndex) {
          setCurrentQuestionIndex(nextQIndex);
        }
      }
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to AI interviewer. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Add message to transcript
  const addToTranscript = useCallback((role: "interviewer" | "candidate", content: string) => {
    setTranscript(prev => [...prev, {
      role,
      content,
      timestamp: new Date()
    }]);
  }, []);

  // Scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

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

  // Interview timer
  useEffect(() => {
    if (isInterviewActive) {
      timerRef.current = setInterval(() => {
        setInterviewDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isInterviewActive]);

  // Get agent token and start conversation
  const startInterview = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micError) {
        toast({
          title: "Microphone Required",
          description: "Please allow microphone access to proceed with the interview.",
          variant: "destructive"
        });
        setIsConnecting(false);
        return;
      }

      console.log("Requesting ElevenLabs agent token...");
      
      // Get conversation token from edge function
      const { data, error } = await supabase.functions.invoke("elevenlabs-agent-token", {
        body: { 
          sessionId,
          systemPrompt: buildSystemPrompt()
        }
      });

      console.log("Token response:", { data, error });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to get AI token");
      }
      
      if (!data?.token) {
        console.error("No token in response:", data);
        throw new Error(data?.error || "No token received from AI service");
      }

      setAgentToken(data.token);
      console.log("Token received, starting recording...");

      // Start recording
      if (streamRef.current) {
        recordingChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(streamRef.current, {
          mimeType: "video/webm;codecs=vp9,opus"
        });
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000);
      }

      console.log("Starting ElevenLabs conversation...");
      
      // Start the conversation with ElevenLabs
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc"
      });

      console.log("Conversation started successfully");

    } catch (error: any) {
      console.error("Failed to start interview:", error);
      toast({
        title: "Failed to Start Interview",
        description: error.message || "Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, sessionId, buildSystemPrompt, toast]);

  // End interview
  const endInterview = useCallback(async () => {
    try {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      // End conversation
      await conversation.endSession();

      // Save recording
      if (recordingChunksRef.current.length > 0) {
        const blob = new Blob(recordingChunksRef.current, { type: "video/webm" });
        const fileName = `ai-interview/${sessionId}/full-interview-${Date.now()}.webm`;
        
        await supabase.storage
          .from("interview-recordings")
          .upload(fileName, blob);
      }

      // Update session in database
      await supabase
        .from("ai_interview_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          answers: transcript.filter(t => t.role === "candidate").map(t => t.content)
        })
        .eq("id", sessionId);

      onComplete(transcript, []);
    } catch (error) {
      console.error("Error ending interview:", error);
    }
  }, [conversation, sessionId, transcript, onComplete]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": return "bg-green-500";
      case "medium": return "bg-yellow-500";
      case "hard": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">AI Technical Interview</h1>
              <p className="text-muted-foreground">
                {jobTitle} • Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isInterviewActive && (
              <Badge variant="destructive" className="animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping" />
                LIVE • {formatTime(interviewDuration)}
              </Badge>
            )}
            <Button variant="outline" onClick={onCancel}>
              Exit Interview
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress: {Math.round(progress)}%</span>
            <span>Duration: {formatTime(interviewDuration)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                Your Camera
              </CardTitle>
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
                {isInterviewActive && (
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
                      Recording
                    </span>
                  </div>
                )}
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <VideoOff className="h-12 w-12 text-white/50" />
                  </div>
                )}
              </div>

              {/* Media Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMic}
                  className={!isMicEnabled ? "bg-red-100 border-red-500" : ""}
                >
                  {isMicEnabled ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4 text-red-500" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleVideo}
                  className={!isVideoEnabled ? "bg-red-100 border-red-500" : ""}
                >
                  {isVideoEnabled ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <VideoOff className="h-4 w-4 text-red-500" />
                  )}
                </Button>

                {!isInterviewActive ? (
                  <Button
                    onClick={startInterview}
                    disabled={isConnecting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Phone className="mr-2 h-4 w-4" />
                        Start Interview
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={endInterview}
                    variant="destructive"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    End Interview
                  </Button>
                )}
              </div>

              {/* AI Status */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Interviewer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    conversation.status === "connected" ? "bg-green-500" : "bg-gray-400"
                  }`} />
                  <span className="text-xs text-muted-foreground capitalize">
                    {conversation.status}
                  </span>
                  {conversation.isSpeaking && (
                    <Badge variant="secondary" className="text-xs">
                      <Volume2 className="h-3 w-3 mr-1 animate-pulse" />
                      Speaking
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Question & Transcript */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Interview Progress</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{currentQuestion?.category}</Badge>
                  <Badge className={getDifficultyColor(currentQuestion?.difficulty || "")}>
                    {currentQuestion?.difficulty}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Question */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                    {currentQuestionIndex + 1}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{currentQuestion?.question}</p>
                    {currentQuestion?.keyPoints && currentQuestion.keyPoints.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Key points to cover:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {currentQuestion.keyPoints.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div>
                <h4 className="text-sm font-medium mb-2">Conversation Transcript</h4>
                <ScrollArea className="h-64 border rounded-lg p-3">
                  {transcript.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p className="text-sm">Conversation will appear here...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transcript.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 ${
                            msg.role === "candidate" ? "justify-end" : ""
                          }`}
                        >
                          {msg.role === "interviewer" && (
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              msg.role === "interviewer"
                                ? "bg-muted"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-xs opacity-60 mt-1">
                              {msg.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          {msg.role === "candidate" && (
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={transcriptEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Question Navigator */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`min-w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
                      idx === currentQuestionIndex
                        ? "bg-primary text-primary-foreground border-primary"
                        : idx < currentQuestionIndex
                        ? "bg-green-100 border-green-500 text-green-700"
                        : "bg-muted border-muted-foreground/30"
                    }`}
                  >
                    {idx < currentQuestionIndex ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        {!isInterviewActive && (
          <Card>
            <CardContent className="py-6">
              <div className="text-center space-y-4">
                <Brain className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">Ready to Start Your AI Interview?</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Click "Start Interview" to begin. The AI interviewer will ask you {questions.length} technical questions. 
                  Speak clearly and take your time to answer each question thoroughly. Your responses will be recorded and evaluated.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Video className="h-4 w-4" />
                    Camera Required
                  </div>
                  <div className="flex items-center gap-1">
                    <Mic className="h-4 w-4" />
                    Microphone Required
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    ~{Math.ceil(questions.length * 3)} minutes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AIInterviewAgent;
