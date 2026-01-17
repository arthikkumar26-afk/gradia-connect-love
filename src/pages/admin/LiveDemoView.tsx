import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Video,
  VideoOff,
  User,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  XCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Users,
  Wifi,
  WifiOff
} from "lucide-react";
import { useWebRTCStreaming } from "@/hooks/useWebRTCStreaming";

interface SessionData {
  id: string;
  status: string;
  live_view_active: boolean;
  live_stream_started_at: string | null;
  candidate_id: string;
  current_stage_order: number;
  candidate_name?: string;
  candidate_email?: string;
  primary_subject?: string;
}

export default function LiveDemoView() {
  console.log("LiveDemoView component mounted");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  console.log("Live demo token:", token);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [waitingForStream, setWaitingForStream] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Start muted to allow autoplay
  const [hasVideoStream, setHasVideoStream] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (token) {
      loadSessionData();
    } else {
      setError("Invalid viewing link. No token provided.");
      setIsLoading(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token]);

  // Poll for stream status updates
  useEffect(() => {
    if (!session?.id) return;

    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('mock_interview_sessions')
        .select('live_view_active, live_stream_started_at, status, current_stage_order')
        .eq('live_view_token', token)
        .maybeSingle();

      if (data) {
        setIsStreamActive(data.live_view_active || false);
        setWaitingForStream(!data.live_view_active && data.status !== 'completed');
        
        if (data.status === 'completed' || (data.current_stage_order > 4 && !data.live_view_active)) {
          setStreamEnded(true);
          setIsStreamActive(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }

        // Update elapsed time from stream start
        if (data.live_stream_started_at && data.live_view_active) {
          const startTime = new Date(data.live_stream_started_at).getTime();
          const now = Date.now();
          setElapsedTime(Math.floor((now - startTime) / 1000));
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session?.id, token]);

  // Timer for elapsed time when stream is active
  useEffect(() => {
    if (isStreamActive && !streamEnded) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
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
  }, [isStreamActive, streamEnded]);

  // WebRTC streaming hook
  const {
    isConnected: webrtcConnected,
    isStreaming: webrtcStreaming,
    connectionState,
    startViewing,
    stopViewing
  } = useWebRTCStreaming({
    sessionId: session?.id || '',
    role: 'viewer',
    onStreamReceived: (stream) => {
      console.log('[LiveDemoView] Received video stream');
      console.log('[LiveDemoView] Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}, readyState: ${t.readyState}`));
      
      if (videoRef.current) {
        // Remove old stream if exists
        if (videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach(t => t.stop());
        }
        
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Start muted for autoplay policy
        
        // Monitor track events for debugging
        stream.getTracks().forEach(track => {
          console.log(`[LiveDemoView] Track ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`);
          track.onended = () => console.log(`[LiveDemoView] Track ${track.kind} ended`);
          track.onmute = () => console.log(`[LiveDemoView] Track ${track.kind} muted`);
          track.onunmute = () => console.log(`[LiveDemoView] Track ${track.kind} unmuted`);
        });
        
        videoRef.current.play()
          .then(() => {
            console.log('[LiveDemoView] Video playing successfully');
            setHasVideoStream(true);
            setAudioEnabled(true);
            toast.success('Live video stream connected! Click the sound button to enable audio.');
          })
          .catch(err => {
            console.error('[LiveDemoView] Error playing video:', err);
            toast.error('Error playing video. Please click to enable.');
          });
      }
    },
    onConnectionStateChange: (state) => {
      console.log('[LiveDemoView] Connection state:', state);
      if (state === 'failed') {
        toast.error('Video connection failed. Retrying...');
        setHasVideoStream(false);
      }
    },
    onError: (error) => {
      console.error('[LiveDemoView] WebRTC error:', error);
    }
  });

  // Start WebRTC viewing when stream becomes active
  useEffect(() => {
    if (session?.id && isStreamActive && !streamEnded) {
      console.log('[LiveDemoView] Starting WebRTC viewing');
      startViewing();
    }
    
    return () => {
      if (!isStreamActive || streamEnded) {
        stopViewing();
      }
    };
  }, [session?.id, isStreamActive, streamEnded, startViewing, stopViewing]);

  const loadSessionData = async () => {
    try {
      // Fetch session by token
      const { data: sessionData, error: sessionError } = await supabase
        .from('mock_interview_sessions')
        .select('id, status, live_view_active, live_stream_started_at, candidate_id, current_stage_order')
        .eq('live_view_token', token)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (!sessionData) {
        setError("Invalid viewing link. Session not found.");
        return;
      }

      // Get candidate details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, primary_subject')
        .eq('id', sessionData.candidate_id)
        .single();

      setSession({
        ...sessionData,
        candidate_name: profileData?.full_name,
        candidate_email: profileData?.email,
        primary_subject: profileData?.primary_subject
      });

      setIsStreamActive(sessionData.live_view_active || false);
      setWaitingForStream(!sessionData.live_view_active && sessionData.status !== 'completed');
      
      if (sessionData.status === 'completed') {
        setStreamEnded(true);
      }

    } catch (error) {
      console.error('Error loading session data:', error);
      setError("Failed to load viewing session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      
      if (!newMutedState) {
        toast.success('Audio enabled');
      }
    }
  };

  // Handle user interaction to enable audio
  const enableAudio = () => {
    if (videoRef.current && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      toast.success('Audio enabled');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading live demo view...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (streamEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Demo Completed</h2>
            <p className="text-muted-foreground mb-4">
              The candidate has completed their demo round. You should receive an email shortly with a feedback link.
            </p>
            <p className="text-sm text-muted-foreground">
              Candidate: <span className="font-medium">{session?.candidate_name}</span>
            </p>
            <Button onClick={() => window.close()} variant="outline" className="mt-4">
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Eye className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Live Demo Viewing</h1>
          <p className="text-muted-foreground">
            Watch the candidate's teaching demonstration in real-time
          </p>
        </div>

        {/* Candidate Info */}
        {session && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Candidate Information
                </CardTitle>
                {isStreamActive ? (
                  <Badge className="bg-red-500 animate-pulse">
                    🔴 LIVE
                  </Badge>
                ) : waitingForStream ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Waiting...
                  </Badge>
                ) : (
                  <Badge variant="secondary">Offline</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{session.candidate_name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">{session.candidate_email || "N/A"}</span>
                </div>
                {session.primary_subject && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{session.primary_subject}</Badge>
                  </div>
                )}
              </div>
              
              {isStreamActive && (
                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {webrtcConnected ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          <Wifi className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Connecting...
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">Demo in progress</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Video Area */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="aspect-video bg-black relative flex items-center justify-center">
              {waitingForStream && !isStreamActive ? (
                <div className="text-center text-white">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <Video className="h-10 w-10 text-white/60" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Waiting for Demo to Start</h3>
                  <p className="text-white/60 text-sm max-w-md mx-auto">
                    The candidate hasn't started their demo yet. This page will automatically update when they begin.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-white/40">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Auto-refreshing...</span>
                  </div>
                </div>
              ) : isStreamActive ? (
                <div className="w-full h-full relative">
                  {/* Video element for WebRTC stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className={`w-full h-full object-contain ${hasVideoStream ? 'block' : 'hidden'}`}
                  />
                  
                  {/* Live indicator overlay */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm font-mono z-10">
                    {formatTime(elapsedTime)}
                  </div>
                  
                  {/* Click to enable audio overlay */}
                  {hasVideoStream && isMuted && (
                    <div 
                      className="absolute inset-0 z-5 cursor-pointer"
                      onClick={enableAudio}
                    >
                      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 animate-pulse">
                        <VolumeX className="h-4 w-4" />
                        Click anywhere to enable audio
                      </div>
                    </div>
                  )}
                  
                  {/* Video controls overlay */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                    <Button
                      size="sm"
                      variant={isMuted ? "destructive" : "secondary"}
                      className={isMuted ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : "bg-black/50 hover:bg-black/70 text-white"}
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Show placeholder while waiting for video stream */}
                  {!hasVideoStream && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                          {webrtcConnected ? (
                            <Loader2 className="h-12 w-12 text-white/80 animate-spin" />
                          ) : (
                            <Video className="h-12 w-12 text-white/80 animate-pulse" />
                          )}
                        </div>
                        <h3 className="text-lg font-medium mb-2">
                          {webrtcConnected ? 'Connecting to Video Stream...' : 'Establishing Connection...'}
                        </h3>
                        <p className="text-white/60 text-sm max-w-md mx-auto">
                          {session?.candidate_name} is presenting their teaching demonstration.
                        </p>
                        <p className="text-white/40 text-xs mt-4">
                          {webrtcConnected 
                            ? 'Video stream will appear shortly' 
                            : 'Connecting via WebRTC...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white">
                  <VideoOff className="h-16 w-16 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">Stream not available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Viewing Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• This page shows the live status of the candidate's demo round</p>
            <p>• Once the demo is complete, you'll receive an email with a feedback link</p>
            <p>• Please provide your feedback promptly to help the candidate progress</p>
            <p>• The feedback link will expire in 7 days</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
