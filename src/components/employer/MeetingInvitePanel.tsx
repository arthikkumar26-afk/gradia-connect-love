import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Send, Loader2, Wand2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Props { candidateId: string; jobTitle?: string | null }
const LABEL = { google_meet: "Google Meet", teams: "Microsoft Teams", other: "Online meeting" } as const;

async function errText(error: any) {
  let msg = error?.message;
  if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error || msg; } catch { /* ignore */ } }
  return typeof msg === "string" ? msg : "Something went wrong";
}

export default function MeetingInvitePanel({ candidateId, jobTitle }: Props) {
  const [platform, setPlatform] = useState<keyof typeof LABEL>("google_meet");
  const [link, setLink] = useState("");
  const [when, setWhen] = useState("");
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<InviteLog[]>([]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("interview_invitation_logs")
      .select("id, job_title, platform, meeting_link, scheduled_at, subject, message, created_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(10);
    setLogs(data || []);
  };

  useEffect(() => { loadLogs(); }, [candidateId]);

  const scheduledAt = when
    ? new Date(when).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }) + " IST"
    : "";

  const generate = async () => {
    if (!prompt.trim()) return toast.error("Write a prompt first");
    if (body.trim() && !window.confirm("Replace the current message with a new draft?")) return;
    setGenerating(true);
    const full = `Interview invitation email${jobTitle ? ` for the role "${jobTitle}"` : ""}, held on ${LABEL[platform]}${scheduledAt ? ` on ${scheduledAt}` : ""}. Instructions: ${prompt.trim()}. Do not include a greeting line, the meeting link, or a sign-off — those are added automatically.`;
    const { data, error } = await supabase.functions.invoke("generate-bulk-email", { body: { prompt: full, emailType: "employer" } });
    setGenerating(false);
    if (error || !data?.content) return toast.error(error ? await errText(error) : "No draft returned");
    setBody(String(data.content).trim());
    if (!subject.trim()) setSubject(`Interview Invitation${jobTitle ? ` – ${jobTitle}` : ""}`);
    setPreview(true);
    toast.success("Draft ready — review it before sending");
  };

  const send = async () => {
    if (!/^https:\/\/\S+$/.test(link.trim())) return toast.error("Paste a valid meeting link starting with https://");
    if (!when) return toast.error("Choose the interview date and time");
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-meeting-invite", {
      body: { candidateId, jobTitle, platform, meetingLink: link.trim(), scheduledAt, message: body.trim() || null, subject: subject.trim() || null },
    });
    setSending(false);
    if (error) return toast.error(await errText(error));
    toast.success(`Interview invitation sent to ${data?.email ?? "candidate"}`);
    setLink(""); setBody(""); setPrompt(""); setSubject(""); setPreview(false);
    loadLogs();
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold text-sm"><Video className="h-4 w-4" /> Interview invitation</div>

      <div className="space-y-1.5">
        <Label className="text-xs">Prompt</Label>
        <Textarea rows={2} maxLength={2000} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Friendly invite for technical round with our security lead, 45 minutes, keep laptop ready" />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Generate mail
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={platform} onValueChange={(v) => setPlatform(v as keyof typeof LABEL)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="z-[1600]">
            <SelectItem value="google_meet">Google Meet</SelectItem>
            <SelectItem value="teams">Microsoft Teams</SelectItem>
            <SelectItem value="other">Other link</SelectItem>
          </SelectContent>
        </Select>
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <Input placeholder={platform === "teams" ? "https://teams.microsoft.com/l/meetup-join/..." : "https://meet.google.com/abc-defg-hij"} value={link} onChange={(e) => setLink(e.target.value)} maxLength={1000} />
      <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
      <Textarea rows={6} placeholder="Message (generate from the prompt above or write your own)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />

      {preview && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed space-y-2">
          <div className="text-xs text-muted-foreground">Subject: <span className="font-medium text-foreground">{subject || `Interview Invitation${jobTitle ? ` – ${jobTitle}` : ""}`}</span></div>
          <p>Dear Candidate,</p>
          {body.trim()
            ? <p className="whitespace-pre-wrap">{body}</p>
            : <p>We are pleased to invite you to an interview{jobTitle ? ` for ${jobTitle}` : ""}.</p>}
          <p><b>Date &amp; time:</b> {scheduledAt || "—"}<br /><b>Platform:</b> {LABEL[platform]}</p>
          <span className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground font-semibold">Join {LABEL[platform]}</span>
          <p className="text-xs text-muted-foreground break-all">{link || "Meeting link"}</p>
          <p>Best regards,<br /><b>Your company</b><br />via Gradia · gradia.world</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setPreview((p) => !p)}>
          {preview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {preview ? "Hide preview" : "Preview"}
        </Button>
        <Button onClick={send} disabled={sending || generating}>
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Send Interview Invitation
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="space-y-2 pt-1 border-t">
          <div className="text-xs font-semibold text-muted-foreground pt-2">Sent invitations ({logs.length})</div>
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium text-foreground">{log.subject || "Interview Invitation"}</span>
                <span className="text-xs text-muted-foreground">
                  Sent {new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              {log.scheduled_at && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Date & time:</span> {log.scheduled_at} ·{" "}
                  {LABEL[log.platform as keyof typeof LABEL] || log.platform}
                </div>
              )}
              {log.message && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{log.message}</p>
              )}
              <a
                href={log.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {log.meeting_link}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
