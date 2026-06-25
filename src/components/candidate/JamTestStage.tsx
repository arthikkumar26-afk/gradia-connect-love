import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Mic, Loader2, Play, ArrowLeft, Sparkles, Timer, CheckCircle2, ArrowRight } from "lucide-react";

const JAM_TOPICS = [
  "Why I want this job",
  "A challenge I overcame recently",
  "My greatest professional strength",
  "If I were CEO for a day",
  "The importance of teamwork",
  "What success means to me",
  "A book or person that influenced me",
  "Why communication skills matter",
  "How I handle pressure at work",
  "My biggest learning from college",
  "The role of technology in our future",
  "Why first impressions matter",
];

interface Props {
  sessionId: string;
  stageOrder: number;
  stageName: string;
  profile: any;
  onCompleted: () => void;
  onCancel: () => void;
}

const JamTestStage = ({ sessionId, stageOrder, stageName, profile, onCompleted, onCancel }: Props) => {
  const [topic] = useState(() => JAM_TOPICS[Math.floor(Math.random() * JAM_TOPICS.length)]);
  const [phase, setPhase] = useState<"intro" | "countdown" | "recording" | "uploading" | "evaluating" | "done">("intro");
  const [countdown, setCountdown] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const attachStreamToVideo = async () => {
    const v = videoRef.current;
    const s = streamRef.current;
    if (!v || !s) return;
    try {
      if (v.srcObject !== s) v.srcObject = s;
      v.muted = true;
      v.playsInline = true;
      await v.play().catch(() => {});
    } catch (e) { console.warn("video attach failed", e); }
  };

  const start = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      setPhase("countdown");
      // Wait a tick so the <video> element mounts, then attach the stream.
      setTimeout(() => { attachStreamToVideo(); }, 50);
      setCountdown(3);
      let c = 3;
      const cdInterval = setInterval(() => {
        c -= 1;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(cdInterval);
          beginRecording();
        }
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setPermissionError("Please allow camera and microphone access to start the JAM test.");
    }
  };

  const beginRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeCandidates = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    const mime = mimeCandidates.find((m) => {
      try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
    });
    const rec = mime ? new MediaRecorder(streamRef.current, { mimeType: mime }) : new MediaRecorder(streamRef.current);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => finalize();
    rec.start(1000);
    setPhase("recording");
    setSecondsLeft(60);
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          try { rec.stop(); } catch {}
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const captureSnapshot = (): string | null => {
    try {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return null;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(640, v.videoWidth);
      canvas.height = Math.round((canvas.width / v.videoWidth) * v.videoHeight);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch { return null; }
  };

  const finalize = async () => {
    try {
      setPhase("uploading");
      const snapshot = captureSnapshot();
      // Stop tracks AFTER snapshot
      streamRef.current?.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      let recordingUrl: string | null = null;
      try {
        const fileName = `jam-${sessionId}-${stageOrder}-${Date.now()}.webm`;
        const { error: upErr } = await supabase.storage
          .from("mock-test-recordings")
          .upload(fileName, blob, { contentType: "video/webm", upsert: false });
        if (!upErr) {
          recordingUrl = supabase.storage.from("mock-test-recordings").getPublicUrl(fileName).data.publicUrl;
        }
      } catch (e) { console.warn("upload failed", e); }

      setPhase("evaluating");
      const { error } = await supabase.functions.invoke("evaluate-jam-test", {
        body: {
          sessionId,
          stageOrder,
          stageName,
          topic,
          durationSec: 60 - secondsLeft,
          recordingUrl,
          snapshotDataUrl: snapshot,
          candidateProfile: profile,
        },
      });
      if (error) throw error;
      setPhase("done");
      toast.success("JAM test completed!");
      setTimeout(onCompleted, 1800);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to evaluate JAM test. Please try again.");
      setPhase("intro");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{stageName}</CardTitle>
            <CardDescription className="text-base mt-1">
              Speak for 1 minute on the given topic. AI will evaluate your professional appearance, dressing, and communication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Your Topic</p>
              <p className="text-xl font-bold text-foreground">{topic}</p>
            </div>

            {phase !== "intro" && (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                {phase === "countdown" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <p className="text-7xl font-bold text-white">{countdown > 0 ? countdown : "GO!"}</p>
                  </div>
                )}
                {phase === "recording" && (
                  <>
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-xs font-semibold">REC</span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="text-base font-bold">
                        <Timer className="h-4 w-4 mr-1" />
                        {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            )}

            {phase === "intro" && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Camera will turn on for AI visual evaluation (dressing, grooming, posture).</p>
                  <p className="flex items-center gap-2"><Mic className="h-4 w-4 text-primary" /> Microphone will capture your speech.</p>
                  <p className="flex items-center gap-2"><Timer className="h-4 w-4 text-primary" /> You have exactly 60 seconds — the test auto-stops when the timer ends.</p>
                </div>
                {permissionError && (
                  <p className="text-sm text-destructive text-center">{permissionError}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={start} className="w-full gap-2" size="lg">
                    <Play className="h-5 w-5" /> Start JAM Test
                  </Button>
                  <Button variant="outline" onClick={onCancel} className="w-full gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                </div>
              </>
            )}

            {(phase === "uploading" || phase === "evaluating") && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {phase === "uploading" ? "Uploading your recording..." : "AI is evaluating your presentation..."}
                </p>
              </div>
            )}

            {phase === "done" && (
              <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center">
                  <CardContent className="py-10 flex flex-col items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-green-600">Done!</h2>
                      <p className="text-sm text-muted-foreground mt-1">{stageName} completed</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Returning to your mock test stages…
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JamTestStage;
