import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, AlertCircle, Video, Loader2, RefreshCw, Camera } from "lucide-react";
import { AIInterviewSession } from "@/components/interview/AIInterviewSession";

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

interface VideoInstructions {
  title: string;
  description: string;
  guidelines: string[];
}

const Interview = () => {
  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const candidateIdParam = urlParams.get("candidateId");
  const stageIdParam = urlParams.get("stageId");
  const typeParam = urlParams.get("type");

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
  const [closeCountdown, setCloseCountdown] = useState(5);
  const [cameraReady, setCameraReady] = useState(false);
  const [isVideoStage, setIsVideoStage] = useState(false);
  const [videoInstructions, setVideoInstructions] = useState<VideoInstructions | null>(null);
  const [demoVideoFile, setDemoVideoFile] = useState<File | null>(null);
  const [demoVideoPreview, setDemoVideoPreview] = useState<string | null>(null);
  const [uploadingDemoVideo, setUploadingDemoVideo] = useState(false);
  const [isAIInterview, setIsAIInterview] = useState(false);
  const [interviewCandidateId, setInterviewCandidateId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Initialize interview - now handles both token-based and direct link approaches
  const initInterview = useCallback(async () => {
    console.log('Interview: initInterview called with params:', { token, candidateIdParam, stageIdParam, typeParam });
    
    // Handle direct link (from email with candidateId and stageId)
    if (candidateIdParam && stageIdParam) {
      console.log('Interview: Direct link mode with candidateId:', candidateIdParam, 'stageId:', stageIdParam);
      setInterviewCandidateId(candidateIdParam);
      
      // Check if this is an AI interview - render AI interview component
      if (typeParam === 'ai-technical') {
        console.log('Interview: AI Technical Interview mode');
        
        // Fetch basic candidate and job info for display
        try {
          const { data: candidateData, error: candidateError } = await supabase
            .from('interview_candidates')
            .select(`
              *,
              candidate:profiles(full_name),
              job:jobs(job_title)
            `)
            .eq('id', candidateIdParam)
            .single();
          
          if (candidateData) {
            setCandidateName(candidateData.candidate?.full_name || 'Candidate');
            setJobTitle(candidateData.job?.job_title || 'Position');
          }
        } catch (err) {
          console.log('Interview: Could not fetch candidate info, using defaults');
        }
        
        setIsAIInterview(true);
        setLoading(false);
        return;
      }
      
      // For other interview types, fetch interview data via edge function
      try {
        console.log('Interview: Calling start-interview for non-AI interview');
        const { data, error: fnError } = await supabase.functions.invoke('start-interview', {
          body: { 
            interviewCandidateId: candidateIdParam,
            stageId: stageIdParam,
            type: typeParam
          }
        });

        console.log('Interview: start-interview response:', { data, fnError });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        setResponseId(data.responseId);
        setQuestions(data.questions || []);
        setAnswers(new Array((data.questions || []).length).fill(null));
        setCandidateName(data.candidateName || 'Candidate');
        setJobTitle(data.jobTitle || 'Position');
        setStageName(data.stageName || 'Interview');
        setIsVideoStage(data.isVideoStage || false);
        setVideoInstructions(data.videoInstructions || null);
        setLoading(false);
      } catch (err: any) {
        console.error('Interview: Error initializing direct link', err);
        setError(err.message || 'Failed to load interview.');
        setLoading(false);
      }
      return;
    }
    
    // Handle token-based link (legacy)
    if (!token) {
      console.log('Interview: No token or direct link params found');
      setError("Invalid interview link. Please use the link from your email.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Interview: Calling start-interview function');
      const { data, error: fnError } = await supabase.functions.invoke('start-interview', {
        body: { token }
      });

      console.log('Interview: Response received', { data, fnError });

      if (fnError) {
        console.error('Interview: Function error', fnError);
        throw new Error(fnError.message || 'Failed to connect to interview service');
      }

      if (data?.error) {
        console.error('Interview: Data error', data.error);
        throw new Error(data.error);
      }

      if (!data) {
        throw new Error('No response received from interview service');
      }

      // Validate required fields
      if (!data.responseId) {
        console.error('Interview: Missing responseId in data', data);
        throw new Error('Invalid interview response - missing response ID');
      }

      setResponseId(data.responseId);
      setQuestions(data.questions || []);
      setAnswers(new Array((data.questions || []).length).fill(null));
      setCandidateName(data.candidateName || 'Candidate');
      setJobTitle(data.jobTitle || 'Position');
      setStageName(data.stageName || 'Interview');
      setIsVideoStage(data.isVideoStage || false);
      setVideoInstructions(data.videoInstructions || null);
      
      console.log('Interview: State set successfully', {
        questionsCount: (data.questions || []).length,
        isVideoStage: data.isVideoStage,
        stageName: data.stageName,
        responseId: data.responseId
      });
      
      setLoading(false);
    } catch (err: any) {
      console.error('Interview: Error initializing', err);
      setError(err.message || 'Failed to load interview. Please try again.');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    console.log('Interview: useEffect running, calling initInterview');
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

  // Auto-close countdown effect - must be before conditional returns
  useEffect(() => {
    if (!completed) return;
    
    const timer = setInterval(() => {
      setCloseCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [completed]);

  // Initialize webcam preview
  const initWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: true
      });
      webcamStreamRef.current = stream;
      setCameraReady(true);
      toast.success("Camera ready");
    } catch (err) {
      console.error('Webcam error:', err);
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  };

  // Attach stream to video element when ready
  useEffect(() => {
    if (cameraReady && webcamStreamRef.current && webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = webcamStreamRef.current;
    }
  }, [cameraReady]);

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

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      toast.success("Recording started (Screen + Camera)");
    } catch (err) {
      console.error('Recording error:', err);
      toast.error("Could not start recording. You can still proceed with the interview.");
    }
  };

  const stopRecordingAndUpload = (): Promise<string | null> => {
    return new Promise((resolve) => {
      console.log('stopRecordingAndUpload called, mediaRecorder:', !!mediaRecorderRef.current, 'chunks:', chunksRef.current.length);
      
      if (!mediaRecorderRef.current) {
        console.log('No mediaRecorder, resolving null');
        resolve(null);
        return;
      }

      // Check if recorder is in a valid state
      if (mediaRecorderRef.current.state === 'inactive') {
        console.log('MediaRecorder already inactive, checking if we have chunks');
        // If we have chunks but recorder stopped, still try to upload
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          uploadRecording(blob).then(resolve);
          return;
        }
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        console.log('MediaRecorder stopped, chunks:', chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const uploadedUrl = await uploadRecording(blob);
        resolve(uploadedUrl);
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  };

  const uploadRecording = async (blob: Blob): Promise<string | null> => {
    let uploadedUrl: string | null = null;
    
    console.log('Uploading recording, blob size:', blob.size, 'responseId:', responseId);
    
    if (responseId && blob.size > 0) {
      const fileName = `${responseId}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interview-recordings')
        .upload(fileName, blob);

      console.log('Upload result:', uploadData, 'error:', uploadError);

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('interview-recordings')
          .getPublicUrl(fileName);
        uploadedUrl = publicUrl;
        setRecordingUrl(publicUrl);
        console.log('Recording uploaded successfully:', publicUrl);
      }
    }
    
    // Stop all tracks
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    webcamStreamRef.current?.getTracks().forEach(track => track.stop());
    
    return uploadedUrl;
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

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setTotalTime(timeTaken);

    // Stop recording and wait for upload to complete
    const uploadedRecordingUrl = await stopRecordingAndUpload();

    try {
      const { data, error: fnError } = await supabase.functions.invoke('submit-interview', {
        body: {
          responseId,
          answers: answers.map(a => a ?? -1),
          timeTaken,
          recordingUrl: uploadedRecordingUrl,
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

  // Handle demo video file selection
  const handleDemoVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Video file is too large. Maximum size is 100MB.");
        return;
      }
      setDemoVideoFile(file);
      setDemoVideoPreview(URL.createObjectURL(file));
    }
  };

  // Handle demo video submission
  const handleDemoVideoSubmit = async () => {
    if (!demoVideoFile || !responseId) {
      toast.error("Please select a video file first");
      return;
    }

    setUploadingDemoVideo(true);

    try {
      // Upload video to storage
      const fileName = `${responseId}/${Date.now()}-demo.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('demo-videos')
        .upload(fileName, demoVideoFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('demo-videos')
        .getPublicUrl(fileName);

      // Submit interview with demo video URL
      const { data, error: fnError } = await supabase.functions.invoke('submit-interview', {
        body: {
          responseId,
          answers: [],
          timeTaken: 0,
          demoVideoUrl: publicUrl,
          isVideoSubmission: true,
        }
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message);
      }

      toast.success("Demo video submitted successfully!");
      setCompleted(true);
    } catch (err: any) {
      console.error('Demo video upload error:', err);
      toast.error(err.message || "Failed to upload demo video");
    } finally {
      setUploadingDemoVideo(false);
    }
  };

  console.log('Interview: Render state - loading:', loading, 'error:', error, 'started:', started, 'completed:', completed, 'questions:', questions.length, 'isVideoStage:', isVideoStage);

  // Render AI Interview Session for AI Technical Interview type
  if (isAIInterview && interviewCandidateId) {
    return (
      <div className="min-h-screen bg-background">
        <AIInterviewSession
          interviewCandidateId={interviewCandidateId}
          jobId=""
          jobTitle="Technical Position"
          candidateName=""
          onComplete={() => {
            setCompleted(true);
            toast.success("AI Interview completed successfully!");
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center bg-card p-8 rounded-lg shadow-lg border">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-foreground font-medium">Loading interview...</p>
          <p className="mt-2 text-sm text-muted-foreground">Please wait while we prepare your questions</p>
        </div>
      </div>
    );
  }

  // Handle case where no questions loaded and it's not a video stage
  if (!loading && !error && !isVideoStage && questions.length === 0 && !completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Interview Setup</h2>
            <p className="text-muted-foreground mb-6">
              We're preparing your interview questions. Please wait a moment and try again.
            </p>
            <Button onClick={initInterview} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Load Interview
            </Button>
          </CardContent>
        </Card>
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
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Interview Completed!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for completing the {stageName} for {jobTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              The hiring team will review your submission and contact you with next steps.
            </p>
            <div className="mt-6 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                This window will close automatically in <span className="font-semibold text-foreground">{closeCountdown}</span> seconds
              </p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.close()}
            >
              Close Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Demo Video Stage UI
  if (isVideoStage && !completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">🎥 Demo Video Round</CardTitle>
            <p className="text-muted-foreground mt-2">
              {stageName} for <span className="font-semibold text-foreground">{jobTitle}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {videoInstructions && (
              <div className="bg-primary/5 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-primary">{videoInstructions.title}</h3>
                <p className="text-sm text-muted-foreground">{videoInstructions.description}</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {videoInstructions.guidelines.map((guideline, idx) => (
                    <li key={idx}>• {guideline}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Video Upload Area */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              {!demoVideoPreview ? (
                <div className="text-center">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your teaching demonstration video
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleDemoVideoSelect}
                      className="hidden"
                    />
                    <Button variant="outline" asChild>
                      <span>
                        <Video className="h-4 w-4 mr-2" />
                        Select Video File
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">
                    Max file size: 100MB | Formats: MP4, WebM, MOV
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={demoVideoPreview}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {demoVideoFile?.name} ({(demoVideoFile?.size || 0 / 1024 / 1024).toFixed(1)} MB)
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDemoVideoFile(null);
                        setDemoVideoPreview(null);
                      }}
                    >
                      Change Video
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleDemoVideoSubmit}
              className="w-full"
              size="lg"
              disabled={!demoVideoFile || uploadingDemoVideo}
            >
              {uploadingDemoVideo ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading Video...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Demo Video
                </>
              )}
            </Button>
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
                <Badge className="absolute top-2 right-2 bg-success">
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

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-warning/10 p-3 rounded-lg">
              <Video className="h-4 w-4 text-warning" />
              <span>You'll be prompted to share your screen when you start. Camera is optional but recommended.</span>
            </div>

            <Button onClick={handleStart} className="w-full" size="lg">
              {cameraReady ? 'Start Interview' : 'Start Interview (Camera Optional)'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safety check for questions
  if (!questions || questions.length === 0 || currentIndex >= questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Questions</h2>
            <p className="text-muted-foreground mb-6">
              Please wait while we prepare your interview questions...
            </p>
            <Button onClick={initInterview} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  
  // Additional safety check for current question
  if (!currentQuestion || !currentQuestion.options) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Question Error</h2>
            <p className="text-muted-foreground mb-6">
              There was an issue loading this question. Please try again.
            </p>
            <Button onClick={initInterview} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
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
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${timeLeft <= 10 ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
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
              {(currentQuestion.options || []).map((option, idx) => (
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
                    {typeof option === 'string' ? option : JSON.stringify(option)}
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
