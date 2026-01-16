import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Circle, 
  Square, 
  Pause, 
  Play,
  Upload,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface VideoRecorderProps {
  isRecording: boolean;
  isPaused: boolean;
  isUploading: boolean;
  previewUrl: string | null;
  error: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onUpload: () => void;
  onReset: () => void;
  setVideoElement: (element: HTMLVideoElement | null) => void;
  stream: MediaStream | null;
  recordingDuration?: number;
  compact?: boolean;
}

export const VideoRecorder = ({
  isRecording,
  isPaused,
  isUploading,
  previewUrl,
  error,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onUpload,
  onReset,
  setVideoElement,
  stream,
  recordingDuration = 0,
  compact = false
}: VideoRecorderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, [setVideoElement]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.play();
    }
  }, [stream]);

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? '' : 'overflow-hidden'}>
      <CardContent className={compact ? 'p-3' : 'p-0'}>
        {/* Video Preview */}
        <div className={`relative bg-black ${compact ? 'aspect-video rounded-lg overflow-hidden' : 'aspect-video'}`}>
          {previewUrl ? (
            <video
              src={previewUrl}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Badge 
                variant="destructive" 
                className={`flex items-center gap-1.5 ${isPaused ? 'bg-amber-500' : 'animate-pulse'}`}
              >
                <Circle className="h-2 w-2 fill-current" />
                {isPaused ? 'PAUSED' : 'REC'}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                {formatDuration(recordingDuration)}
              </Badge>
            </div>
          )}

          {/* Camera/Mic Controls During Recording */}
          {isRecording && stream && (
            <div className="absolute bottom-3 left-3 flex gap-2">
              <Button
                size="icon"
                variant={isCameraOn ? 'secondary' : 'destructive'}
                className="h-8 w-8"
                onClick={toggleCamera}
              >
                {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant={isMicOn ? 'secondary' : 'destructive'}
                className="h-8 w-8"
                onClick={toggleMic}
              >
                {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={`flex items-center justify-center gap-3 ${compact ? 'mt-3' : 'p-4'}`}>
          {!isRecording && !previewUrl && (
            <Button onClick={onStartRecording} className="gap-2">
              <Circle className="h-4 w-4 fill-red-500 text-red-500" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <>
              {isPaused ? (
                <Button onClick={onResumeRecording} variant="outline" className="gap-2">
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
              ) : (
                <Button onClick={onPauseRecording} variant="outline" className="gap-2">
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
              <Button onClick={onStopRecording} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          )}

          {previewUrl && !isRecording && (
            <>
              <Button onClick={onReset} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Re-record
              </Button>
              <Button onClick={onUpload} disabled={isUploading} className="gap-2">
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Save Recording
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
