import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversation } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Clock, 
  Brain, 
  CheckCircle2,
  Loader2,
  Monitor,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Bot,
  Sparkles,
  Volume2,
  VolumeX,
  Users,
  Wifi
} from 'lucide-react';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import { useWebRTCStreaming } from '@/hooks/useWebRTCStreaming';

interface DemoEvaluation {
  overallScore: number;
  criteria: {
    teachingClarity: { score: number; feedback: string };
    subjectKnowledge: { score: number; feedback: string };
    presentationSkills: { score: number; feedback: string };
    timeManagement: { score: number; feedback: string };
    overallPotential: { score: number; feedback: string };
  };
  strengths: string[];
  improvements: string[];
  recommendation: string;
  detailedFeedback: string;
}

export default function DemoRound() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const stageOrder = searchParams.get('stage') || '4';

  const [isLoading, setIsLoading] = useState(true);
  const [demoTopic, setDemoTopic] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<DemoEvaluation | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState(0);
  const [voiceAIActive, setVoiceAIActive] = useState(false);
  const [voiceAIConnecting, setVoiceAIConnecting] = useState(false);
  const [voiceAIMessage, setVoiceAIMessage] = useState('');
  const [lastSpokenInstruction, setLastSpokenInstruction] = useState(-1);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    uploadRecording,
  } = useVideoRecorder();

  // WebRTC streaming hook for broadcasting to management
  const {
    isConnected: webrtcConnected,
    isStreaming: webrtcStreaming,
    viewerCount,
    startBroadcasting,
    stopBroadcasting
  } = useWebRTCStreaming({
    sessionId: sessionId || '',
    role: 'broadcaster',
    onConnectionStateChange: (state) => {
      console.log('[DemoRound] WebRTC connection state:', state);
      if (state === 'connected') {
        toast.success('Live stream connected to viewer!');
      }
    },
    onError: (error) => {
      console.error('[DemoRound] WebRTC error:', error);
    }
  });


  const MAX_DURATION = 600; // 10 minutes

  // AI Instructor messages based on time
  const aiInstructions = [
    { time: 0, message: "Welcome! Start by introducing yourself and the topic you'll be teaching today.", icon: "👋", voice: "Welcome! Please start by introducing yourself and the topic you will be teaching today." },
    { time: 30, message: "Great start! Now explain why this topic is important and what students will learn.", icon: "🎯", voice: "Great start! Now explain why this topic is important and what students will learn." },
    { time: 60, message: "Begin explaining the core concept. Remember to speak clearly and at a steady pace.", icon: "📚", voice: "Now begin explaining the core concept. Remember to speak clearly and at a steady pace." },
    { time: 120, message: "Excellent! Use an example or analogy to help students understand better.", icon: "💡", voice: "Excellent! Try using an example or analogy to help students understand better." },
    { time: 180, message: "You're doing well! Try to engage as if students are present - ask rhetorical questions.", icon: "❓", voice: "You're doing well! Try to engage as if students are present. Ask some rhetorical questions." },
    { time: 240, message: "If applicable, demonstrate a practical application of the concept.", icon: "🔧", voice: "If applicable, demonstrate a practical application of the concept you're teaching." },
    { time: 300, message: "Halfway there! Summarize key points covered so far before continuing.", icon: "📝", voice: "You're halfway there! Take a moment to summarize the key points you've covered so far." },
    { time: 360, message: "Cover any additional details or advanced aspects of your topic.", icon: "🚀", voice: "Now cover any additional details or advanced aspects of your topic." },
    { time: 420, message: "Address common mistakes or misconceptions students might have.", icon: "⚠️", voice: "Address any common mistakes or misconceptions that students might have about this topic." },
    { time: 480, message: "Start wrapping up. Provide a brief summary of everything you've taught.", icon: "🎁", voice: "Start wrapping up now. Provide a brief summary of everything you've taught." },
    { time: 540, message: "Final minute! Conclude with key takeaways and encourage practice.", icon: "🏁", voice: "Final minute! Conclude with your key takeaways and encourage students to practice." },
    { time: 570, message: "Excellent work! Feel free to end your demo when ready.", icon: "✨", voice: "Excellent work! You can end your demo whenever you're ready. Thank you for your presentation!" },
  ];

  // ElevenLabs Voice AI conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('Voice AI connected');
      setVoiceAIActive(true);
      setVoiceAIConnecting(false);
      toast.success('Voice AI Instructor connected!');
    },
    onDisconnect: () => {
      console.log('Voice AI disconnected');
      setVoiceAIActive(false);
    },
    onMessage: (message: unknown) => {
      console.log('Voice AI message:', message);
      const msg = message as { type?: string; agent_response_event?: { agent_response?: string } };
      if (msg.type === 'agent_response') {
        setVoiceAIMessage(msg.agent_response_event?.agent_response || '');
      }
    },
    onError: (error) => {
      console.error('Voice AI error:', error);
      setVoiceAIConnecting(false);
      toast.error('Voice AI connection failed');
    },
  });

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          if (prev >= MAX_DURATION) {
            handleStopDemo();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Update AI instruction based on time and send voice instruction
  useEffect(() => {
    if (isRecording) {
      const currentIdx = aiInstructions.findIndex((instr, idx) => {
        const nextInstr = aiInstructions[idx + 1];
        return timeElapsed >= instr.time && (!nextInstr || timeElapsed < nextInstr.time);
      });
      if (currentIdx !== -1 && currentIdx !== currentInstruction) {
        setCurrentInstruction(currentIdx);
        
        // Send voice instruction if AI is connected and this is a new instruction
        if (voiceAIActive && currentIdx !== lastSpokenInstruction) {
          const instruction = aiInstructions[currentIdx];
          conversation.sendContextualUpdate(instruction.voice);
          setLastSpokenInstruction(currentIdx);
        }
      }
    }
  }, [timeElapsed, isRecording, voiceAIActive, lastSpokenInstruction]);

  // Connect to Voice AI when demo starts
  const connectVoiceAI = useCallback(async () => {
    try {
      setVoiceAIConnecting(true);
      
      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-demo-instructor', {
        body: { action: 'get-token' }
      });

      if (error || !data?.token) {
        console.error('Failed to get voice AI token:', error || 'No token received');
        setVoiceAIConnecting(false);
        return;
      }

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc' as const,
      });

    } catch (error) {
      console.error('Failed to connect voice AI:', error);
      setVoiceAIConnecting(false);
    }
  }, [conversation]);

  // Disconnect Voice AI
  const disconnectVoiceAI = useCallback(async () => {
    try {
      await conversation.endSession();
      setVoiceAIActive(false);
    } catch (error) {
      console.error('Failed to disconnect voice AI:', error);
    }
  }, [conversation]);

  // End demo and say thank you
  const handleDemoComplete = useCallback(async () => {
    if (voiceAIActive) {
      // Send thank you message before disconnecting
      conversation.sendContextualUpdate("Thank you so much for your wonderful teaching demonstration! You did a great job. The demo is now complete. Goodbye and best of luck!");
      
      // Wait a moment for the message to be spoken, then disconnect
      setTimeout(async () => {
        await disconnectVoiceAI();
      }, 5000);
    }
  }, [voiceAIActive, conversation, disconnectVoiceAI]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/candidate/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(profileData);
      
      // Set default topic based on profile
      if (profileData?.primary_subject) {
        setDemoTopic(`Introduction to ${profileData.primary_subject}`);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setLocalStream(stream);
      setHasPermissions(true);
      toast.success('Camera and microphone ready!');
    } catch (error) {
      console.error('Permission error:', error);
      toast.error('Please allow camera and microphone access');
    }
  };

  const handleStartDemo = async () => {
    if (!demoTopic.trim()) {
      toast.error('Please enter your demo topic');
      return;
    }

    if (!hasPermissions) {
      await requestPermissions();
      return;
    }

    try {
      // Generate live view token and update session
      const liveViewToken = crypto.randomUUID();
      
      if (sessionId) {
        // Update session with live view token and mark as active
        await supabase
          .from('mock_interview_sessions')
          .update({
            live_view_token: liveViewToken,
            live_view_active: true,
            live_stream_started_at: new Date().toISOString()
          })
          .eq('id', sessionId);
        
        // Notify management that demo is starting with live view link
        supabase.functions.invoke('send-management-notification', {
          body: {
            notificationType: 'demo_started',
            candidateName: profile?.full_name || 'Candidate',
            candidateEmail: profile?.email,
            sessionId,
            liveViewToken,
            appUrl: window.location.origin
          }
        }).then(result => {
          console.log('Management notified of demo start:', result);
        }).catch(err => {
          console.error('Failed to notify management:', err);
        });

        // Start WebRTC broadcasting for live video
        if (localStream) {
          console.log('[DemoRound] Starting WebRTC broadcast');
          startBroadcasting(localStream);
        } else if (videoRef.current?.srcObject) {
          console.log('[DemoRound] Starting WebRTC broadcast from video ref');
          startBroadcasting(videoRef.current.srcObject as MediaStream);
        }
      }

      await startRecording();
      setIsStarted(true);
      setTimeElapsed(0);
      toast.success('Demo started! Teach your topic now.');
      
      // Automatically connect Voice AI when demo starts
      connectVoiceAI();
    } catch (error) {
      console.error('Error starting demo:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopDemo = async () => {
    stopRecording();
    setIsStarted(false);
    
    // Stop WebRTC broadcasting
    stopBroadcasting();
    
    // Mark live stream as inactive
    if (sessionId) {
      await supabase
        .from('mock_interview_sessions')
        .update({ live_view_active: false })
        .eq('id', sessionId);
    }
    
    // Trigger thank you message from voice AI
    await handleDemoComplete();
    
    // Stop video preview
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setLocalStream(null);
  };

  useEffect(() => {
    if (recordedBlob && !isRecording && timeElapsed > 30) {
      submitDemo();
    }
  }, [recordedBlob, isRecording]);

  const submitDemo = async () => {
    if (!recordedBlob || !sessionId) return;
    
    setIsEvaluating(true);
    
    try {
      // Upload recording
      const recordingUrl = await uploadRecording(sessionId, parseInt(stageOrder));
      
      console.log('Submitting demo for evaluation:', { 
        sessionId, 
        stageOrder, 
        demoTopic, 
        duration: timeElapsed 
      });

      // Call evaluation function
      const { data, error } = await supabase.functions.invoke('evaluate-demo-round', {
        body: {
          sessionId,
          stageOrder: parseInt(stageOrder),
          recordingUrl,
          demoTopic,
          candidateProfile: profile,
          durationSeconds: timeElapsed
        }
      });

      if (error) throw error;

      console.log('Evaluation result:', data);
      setEvaluation(data.evaluation);
      setShowResult(true);

      // Send feedback request to management team
      await supabase.functions.invoke('send-management-notification', {
        body: {
          notificationType: 'demo_feedback',
          candidateName: profile?.full_name || 'Candidate',
          candidateEmail: profile?.email,
          sessionId,
          appUrl: window.location.origin
        }
      });
      console.log('Management feedback request sent');

      // Send next stage email if not complete
      if (!data.isComplete && data.nextStage) {
        await supabase.functions.invoke('send-mock-interview-invitation', {
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
        toast.success(`Demo completed! Check email for ${data.nextStage.name} invitation.`);
      } else if (data.isComplete) {
        toast.success('🎊 Congratulations! You completed all interview stages!');
      }

    } catch (error) {
      console.error('Error submitting demo:', error);
      toast.error('Failed to evaluate demo. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showResult && evaluation) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container max-w-4xl">
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <div className={`h-20 w-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                evaluation.overallScore >= 65 ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Demo Round Complete!</CardTitle>
              <CardDescription>AI Teaching Skills Evaluation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
                  {evaluation.overallScore}%
                </p>
                <Badge variant={evaluation.overallScore >= 65 ? 'default' : 'destructive'} className="mt-2">
                  {evaluation.recommendation}
                </Badge>
              </div>

              {/* Criteria Breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Evaluation Breakdown</h3>
                
                {Object.entries(evaluation.criteria).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={getScoreColor(value.score)}>{value.score}%</span>
                    </div>
                    <Progress value={value.score} className="h-2" />
                    <p className="text-xs text-muted-foreground">{value.feedback}</p>
                  </div>
                ))}
              </div>

              {/* Strengths & Improvements */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-green-600 dark:text-green-400">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                  <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">Areas to Improve</h4>
                  <ul className="space-y-1">
                    {evaluation.improvements.map((s, i) => (
                      <li key={i} className="text-sm text-amber-600 dark:text-amber-400">• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Detailed Feedback */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">AI Feedback</h4>
                <p className="text-sm text-muted-foreground">{evaluation.detailedFeedback}</p>
              </div>

              {/* Recording Playback */}
              {recordedBlob && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Your Demo Recording
                  </h4>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={URL.createObjectURL(recordedBlob)}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Review your teaching demo to see areas for improvement
                  </p>
                </div>
              )}

              <Button onClick={() => navigate('/candidate/dashboard')} className="w-full gap-2">
                Return to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isEvaluating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full animate-ping" />
              <div className="absolute inset-2 border-4 border-primary/50 rounded-full animate-pulse" />
              <div className="absolute inset-4 bg-primary rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary-foreground animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI is Evaluating Your Demo</h3>
            <p className="text-muted-foreground">
              Analyzing teaching clarity, subject knowledge, and presentation skills...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <Badge className="mb-4">Stage {stageOrder} of 3</Badge>
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Monitor className="h-8 w-8 text-primary" />
            Demo Round
          </h1>
          <p className="text-muted-foreground mt-2">
            Demonstrate your teaching skills in a 5-10 minute live demo
          </p>
        </div>

        {/* Instructions */}
        {!isStarted && !hasPermissions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Choose Your Topic</p>
                    <p className="text-sm text-muted-foreground">Select a topic you're comfortable teaching</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Start Demo</p>
                    <p className="text-sm text-muted-foreground">AI will monitor your teaching demonstration (5-10 minutes)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Get AI Review</p>
                    <p className="text-sm text-muted-foreground">Receive detailed feedback on teaching clarity, knowledge & presentation</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Tips for a Great Demo</p>
                  <ul className="text-sm text-amber-600 dark:text-amber-400 mt-1 space-y-1">
                    <li>• Speak clearly and at a moderate pace</li>
                    <li>• Explain concepts step by step</li>
                    <li>• Use examples to illustrate points</li>
                    <li>• Maintain eye contact with the camera</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo Interface */}
        <Card className={isStarted ? 'border-primary' : ''}>
          <CardContent className="py-6 space-y-6">
            {/* Topic Input */}
            {!isStarted && (
              <div className="space-y-2">
                <Label htmlFor="topic">Demo Topic *</Label>
                <Input
                  id="topic"
                  value={demoTopic}
                  onChange={(e) => setDemoTopic(e.target.value)}
                  placeholder="e.g., Introduction to Algebra, Basic English Grammar, etc."
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Choose a topic you're confident teaching (5-10 minute explanation)
                </p>
              </div>
            )}

            {/* Video Preview */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              
              {!hasPermissions && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Camera preview will appear here</p>
                  </div>
                </div>
              )}

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
                  <div className="h-3 w-3 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-medium">RECORDING</span>
                </div>
              )}

              {/* Live viewers indicator */}
              {isStarted && webrtcConnected && (
                <div className="absolute top-4 left-36 flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-full">
                  <Users className="h-3 w-3" />
                  <span className="text-sm font-medium">{viewerCount} watching</span>
                </div>
              )}

              {/* Streaming status indicator */}
              {isStarted && (
                <div className={`absolute bottom-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-white ${webrtcStreaming ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  <Wifi className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {webrtcStreaming ? 'Streaming to viewers' : 'Connecting...'}
                  </span>
                </div>
              )}

              {/* Timer */}
              {isStarted && (
                <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg">{formatTime(timeElapsed)}</span>
                  <span className="text-sm text-white/70">/ {formatTime(MAX_DURATION)}</span>
                </div>
              )}

              {/* Progress bar */}
              {isStarted && (
                <div className="absolute bottom-0 left-0 right-0">
                  <Progress value={(timeElapsed / MAX_DURATION) * 100} className="h-1 rounded-none" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap justify-center gap-4">
              {!isStarted ? (
                <>
                  {!hasPermissions && (
                    <Button onClick={requestPermissions} variant="outline" className="gap-2">
                      <Video className="h-4 w-4" />
                      Enable Camera
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleStartDemo} 
                    disabled={!demoTopic.trim()}
                    size="lg" 
                    className="gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Start Demo
                  </Button>
                </>
              ) : (
                <>
                  {/* Voice AI Status during recording */}
                  {voiceAIActive && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Volume2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-700 dark:text-green-400">Voice AI Active</span>
                      {conversation.isSpeaking && (
                        <Badge variant="outline" className="text-xs animate-pulse">Speaking...</Badge>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleStopDemo} 
                    variant="destructive" 
                    size="lg" 
                    className="gap-2"
                    disabled={timeElapsed < 30}
                  >
                    <Square className="h-5 w-5" />
                    End Demo {timeElapsed < 30 && `(${30 - timeElapsed}s min)`}
                  </Button>
                </>
              )}
            </div>

            {/* AI Instructor Panel */}
            {isStarted && (
              <div className="mt-4">
                <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <div className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg ${
                          voiceAIActive 
                            ? 'bg-gradient-to-br from-green-500 to-green-600' 
                            : 'bg-gradient-to-br from-primary to-primary/80'
                        } ${conversation.isSpeaking ? 'animate-pulse' : ''}`}>
                          <Bot className="h-7 w-7 text-white" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border-2 border-background ${
                          voiceAIActive ? 'bg-green-500' : 'bg-primary'
                        }`}>
                          {voiceAIActive ? (
                            <Volume2 className="h-3 w-3 text-white" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-primary">AI Instructor</span>
                          <Badge variant={voiceAIActive ? "default" : "outline"} className="text-xs">
                            {voiceAIActive ? (conversation.isSpeaking ? '🎤 Speaking' : '🎧 Listening') : 'Text Mode'}
                          </Badge>
                        </div>
                        <div className="bg-background/80 backdrop-blur rounded-lg p-3 border border-primary/20 relative">
                          <span className="text-2xl mr-2">{aiInstructions[currentInstruction]?.icon}</span>
                          <p className="text-sm inline">
                            {voiceAIMessage || aiInstructions[currentInstruction]?.message}
                          </p>
                          <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-background/80" />
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Next tip in {Math.max(0, (aiInstructions[currentInstruction + 1]?.time || MAX_DURATION) - timeElapsed)}s</span>
                          <span className="mx-1">•</span>
                          <span>Teaching: {demoTopic}</span>
                          {voiceAIActive && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Volume2 className="h-3 w-3" />
                                Voice Active
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
