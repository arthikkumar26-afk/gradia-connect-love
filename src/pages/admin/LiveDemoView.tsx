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
  RefreshCw
} from "lucide-react";

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
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [waitingForStream, setWaitingForStream] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
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
                <div className="w-full h-full flex items-center justify-center">
                  {/* Live indicator overlay */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm font-mono">
                    {formatTime(elapsedTime)}
                  </div>
                  
                  {/* Placeholder for actual video stream */}
                  <div className="text-center text-white">
                    <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Video className="h-12 w-12 text-white/80" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Demo in Progress</h3>
                    <p className="text-white/60 text-sm max-w-md mx-auto">
                      {session?.candidate_name} is currently presenting their teaching demonstration.
                    </p>
                    <p className="text-white/40 text-xs mt-4">
                      Note: Live video streaming requires WebRTC setup. Currently showing status only.
                    </p>
                  </div>
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
