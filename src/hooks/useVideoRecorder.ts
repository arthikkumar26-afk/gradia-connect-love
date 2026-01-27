import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseVideoRecorderOptions {
  onRecordingComplete?: (url: string) => void;
}

export const useVideoRecorder = (options?: UseVideoRecorderOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ownsStreamRef = useRef<boolean>(false);

  // Start recording - optionally accepts an existing stream to reuse
  const startRecording = useCallback(async (existingStream?: MediaStream) => {
    try {
      setError(null);
      chunksRef.current = [];

      let stream: MediaStream;
      
      if (existingStream) {
        // Reuse the provided stream - don't create a new one
        stream = existingStream;
        ownsStreamRef.current = false;
        console.log('[useVideoRecorder] Reusing existing stream for recording');
      } else {
        // Create a new stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        ownsStreamRef.current = true;
        console.log('[useVideoRecorder] Created new stream for recording');
      }

      streamRef.current = stream;

      // Only update video preview if we created the stream
      // If using existing stream, caller manages the preview
      if (ownsStreamRef.current && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      console.log('[useVideoRecorder] Recording started');

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access camera/microphone. Please grant permissions.');
      toast.error('Failed to access camera/microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      console.log('[useVideoRecorder] Recording stopped');

      // Only stop tracks if we created the stream ourselves
      if (streamRef.current && ownsStreamRef.current) {
        console.log('[useVideoRecorder] Stopping owned stream tracks');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      } else {
        console.log('[useVideoRecorder] Not stopping stream - owned by caller');
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isRecording, isPaused]);

  const uploadRecording = useCallback(async (sessionId: string, stageOrder: number): Promise<string | null> => {
    if (!recordedBlob) {
      toast.error('No recording to upload');
      return null;
    }

    setIsUploading(true);
    try {
      const fileName = `mock-interview-${sessionId}-stage-${stageOrder}-${Date.now()}.webm`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('mock-test-recordings')
        .upload(fileName, recordedBlob, {
          contentType: 'video/webm',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('mock-test-recordings')
        .getPublicUrl(fileName);

      const url = publicUrlData.publicUrl;
      setUploadedUrl(url);
      options?.onRecordingComplete?.(url);
      toast.success('Recording uploaded successfully');
      return url;

    } catch (err) {
      console.error('Error uploading recording:', err);
      toast.error('Failed to upload recording');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [recordedBlob, options]);

  const resetRecording = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setError(null);
    chunksRef.current = [];
  }, [previewUrl]);

  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  return {
    isRecording,
    isPaused,
    isUploading,
    recordedBlob,
    previewUrl,
    uploadedUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadRecording,
    resetRecording,
    setVideoElement,
    stream: streamRef.current
  };
};
