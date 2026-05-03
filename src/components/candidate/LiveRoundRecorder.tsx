import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, StopCircle, Loader2, Circle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LiveRoundRecorderProps {
  interviewCandidateId: string;
  stageId: string;
  stageName: string;
  /** Where to "go" when joining: external URL (opens new tab) or internal navigate */
  joinHref: string;
  joinExternal?: boolean;
  onNavigateInternal?: (href: string) => void;
  className?: string;
}

/**
 * Wraps the "Join Meeting" action for live interview rounds.
 * Auto-starts a combined screen + webcam recording before opening the meeting,
 * and uploads it to the `interview-recordings` bucket on stop.
 */
export const LiveRoundRecorder = ({
  interviewCandidateId,
  stageId,
  stageName,
  joinHref,
  joinExternal,
  onNavigateInternal,
  className,
}: LiveRoundRecorderProps) => {
  const [open, setOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const recordingActiveRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRecording]);

  const cleanupStreams = () => {
    recordingActiveRef.current = false;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    webcamStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const startRecording = async () => {
    setIsStarting(true);
    chunksRef.current = [];
    try {
      // Screen
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });
      screenStreamRef.current = screenStream;

      // Webcam
      let webcamStream: MediaStream | null = null;
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        webcamStreamRef.current = webcamStream;
      } catch {
        toast.info("Recording without camera (camera blocked)");
      }

      // Composite via canvas
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d")!;

      const screenVideo = document.createElement("video");
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      await screenVideo.play();

      const webcamVideo = document.createElement("video");
      if (webcamStream) {
        webcamVideo.srcObject = webcamStream;
        webcamVideo.muted = true;
        await webcamVideo.play();
      }

      recordingActiveRef.current = true;
      const drawFrame = () => {
        if (!recordingActiveRef.current) return;
        try {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          if (webcamStreamRef.current) {
            const w = 320, h = 240, p = 20;
            const x = canvas.width - w - p;
            const y = canvas.height - h - p;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
            ctx.drawImage(webcamVideo, x, y, w, h);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
          }
        } catch {}
        requestAnimationFrame(drawFrame);
      };

      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        // User stopped sharing - finalize
        if (recordingActiveRef.current) stopAndUpload();
      });

      requestAnimationFrame(drawFrame);

      const canvasStream = canvas.captureStream(30);
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      if (webcamStream?.getAudioTracks().length) {
        audioCtx.createMediaStreamSource(webcamStream).connect(dest);
      }
      if (screenStream.getAudioTracks().length) {
        audioCtx.createMediaStreamSource(screenStream).connect(dest);
      }

      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mr = new MediaRecorder(combined, { mimeType: "video/webm;codecs=vp9" });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mr;
      mr.start(1000);

      startTimeRef.current = Date.now();
      setElapsed(0);
      setIsRecording(true);
      toast.success("Recording started");

      // Open the meeting now
      if (joinExternal) {
        window.open(joinHref, "_blank", "noopener,noreferrer");
      } else if (onNavigateInternal) {
        onNavigateInternal(joinHref);
      }
    } catch (err) {
      console.error("[LiveRoundRecorder] start error", err);
      toast.error("Could not start screen recording. Please share your screen to continue.");
      cleanupStreams();
    } finally {
      setIsStarting(false);
    }
  };

  const stopAndUpload = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) {
      cleanupStreams();
      setIsRecording(false);
      return;
    }
    setIsUploading(true);
    try {
      const blob: Blob = await new Promise((resolve) => {
        mr.onstop = () => resolve(new Blob(chunksRef.current, { type: "video/webm" }));
        if (mr.state !== "inactive") mr.stop();
        else resolve(new Blob(chunksRef.current, { type: "video/webm" }));
      });
      setIsRecording(false);
      cleanupStreams();

      if (!blob.size) {
        toast.error("Recording was empty");
        return;
      }

      const safeStage = stageName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const fileName = `live-round/${interviewCandidateId}/${safeStage}-${stageId}-${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("interview-recordings")
        .upload(fileName, blob, { contentType: "video/webm", upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("interview-recordings").getPublicUrl(fileName);

      // Persist recording metadata (start/end, participants)
      const startedAt = new Date(startTimeRef.current).toISOString();
      const endedAt = new Date().toISOString();
      try {
        // Resolve participants from interview_candidates -> jobs (employer_id)
        const { data: ic } = await supabase
          .from("interview_candidates")
          .select("candidate_id, jobs:job_id(employer_id)")
          .eq("id", interviewCandidateId)
          .maybeSingle();
        const candidateId = (ic as any)?.candidate_id ?? null;
        const employerId = (ic as any)?.jobs?.employer_id ?? null;

        await supabase.from("live_round_recordings").insert({
          interview_candidate_id: interviewCandidateId,
          stage_id: stageId,
          stage_name: stageName,
          recording_url: pub.publicUrl,
          duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
          started_at: startedAt,
          ended_at: endedAt,
          candidate_id: candidateId,
          employer_id: employerId,
        });
      } catch (e) {
        console.warn("[LiveRoundRecorder] could not persist recording", e);
      }

      toast.success("Recording uploaded");
      setOpen(false);
    } catch (e) {
      console.error("[LiveRoundRecorder] upload error", e);
      toast.error("Failed to upload recording");
    } finally {
      setIsUploading(false);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const r = (s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ||
          "text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 font-medium"
        }
      >
        <Video className="h-3 w-3" />
        Join Meeting
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && isRecording) {
            toast.info("Stop the recording before closing");
            return;
          }
          if (!v) cleanupStreams();
          setOpen(v);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" /> {stageName} — Recorded Session
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {!isRecording && !isUploading && (
              <>
                <p className="text-muted-foreground">
                  This round is automatically recorded (screen + camera). Click below to share your
                  screen and join the meeting. The recording stops and uploads when you click Stop.
                </p>
                <Button
                  onClick={startRecording}
                  disabled={isStarting}
                  className="w-full"
                >
                  {isStarting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparing…</>
                  ) : (
                    <><Video className="h-4 w-4 mr-2" /> Start Recording & Join Meeting</>
                  )}
                </Button>
              </>
            )}

            {isRecording && (
              <>
                <div className="flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-red-600 font-medium">
                    <Circle className="h-3 w-3 fill-red-500 text-red-500 animate-pulse" />
                    Recording…
                  </div>
                  <span className="font-mono text-xs">{fmt(elapsed)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Keep this tab open. Your meeting was launched in a new tab. When the round ends,
                  return here and click Stop & Upload.
                </p>
                <div className="flex gap-2">
                  {joinExternal && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(joinHref, "_blank", "noopener,noreferrer")}
                    >
                      <Video className="h-4 w-4 mr-2" /> Reopen Meeting
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={stopAndUpload}
                  >
                    <StopCircle className="h-4 w-4 mr-2" /> Stop & Upload
                  </Button>
                </div>
              </>
            )}

            {isUploading && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading recording…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveRoundRecorder;
