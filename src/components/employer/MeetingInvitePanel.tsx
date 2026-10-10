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

interface InviteLog {
  id: string;
  job_title: string | null;
  platform: string;
  meeting_link: string;
  scheduled_at: string | null;
  subject: string | null;
  message: string | null;
  created_at: string;
}
const CATEGORY = {
  interview: "Interview invitation",
  payment_reminder: "Payment reminder",
  follow_up: "Follow-up / general",
} as const;
type Category = keyof typeof CATEGORY;
const defaultSubject = (c: Category, job?: string | null) =>
  (c === "interview" ? "Interview Invitation" : c === "payment_reminder" ? "Payment Reminder" : "Update on your application") + (job ? ` – ${job}` : "");
interface PayReq { id: string; amount_paise: number; payment_url: string | null; qr_image_url: string | null; status: string }

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
  const [category, setCategory] = useState<Category>("interview");
  const [includePayment, setIncludePayment] = useState(false);
  const [payReq, setPayReq] = useState<PayReq | null>(null);

  useEffect(() => {
    supabase.from("candidate_payment_requests")
      .select("id, amount_paise, payment_url, qr_image_url, status")
      .eq("candidate_id", candidateId).in("status", ["sent", "failed"])
      .order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => setPayReq((data?.[0] as PayReq) || null));
  }, [candidateId]);
  useEffect(() => { if (category === "payment_reminder" && payReq) setIncludePayment(true); }, [category, payReq]);
  const isInterview = category === "interview";

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
    const ctx = isInterview
      ? `Interview invitation email${jobTitle ? ` for the role "${jobTitle}"` : ""}, held on ${LABEL[platform]}${scheduledAt ? ` on ${scheduledAt}` : ""}.`
      : `${CATEGORY[category]} email to a candidate${jobTitle ? ` for "${jobTitle}"` : ""}${includePayment && payReq ? `, reminding them to pay ₹${(payReq.amount_paise / 100).toLocaleString("en-IN")}` : ""}.`;
    const full = `${ctx} Instructions: ${prompt.trim()}. Reply format: first line exactly "Subject: <a short professional subject that matches this email's content>", then a blank line, then the email body. Do not include a greeting line, links, QR codes, or a sign-off — those are added automatically.`;
    const { data, error } = await supabase.functions.invoke("generate-bulk-email", { body: { prompt: full, emailType: "employer" } });
    setGenerating(false);
    if (error || !data?.content) return toast.error(error ? await errText(error) : "No draft returned");
    let text = String(data.content).trim();
    const m = text.match(/^\s*\**\s*subject\s*:\**\s*(.+)\n/i);
    let subj = "";
    if (m) { subj = m[1].replace(/\*+/g, "").trim(); text = text.slice(m[0].length).trim(); }
    setBody(text);
    setSubject((subj || defaultSubject(category, jobTitle)).slice(0, 200));
    setPreview(true);
    toast.success("Draft ready — review it before sending");
  };

  const send = async () => {
    if (includePayment && !payReq) return toast.error("No open payment request for this candidate. Send a payment mail first.");
    if (!isInterview) {
      if (!body.trim()) return toast.error("Write or generate the message first");
      setSending(true);
      const { data, error } = await supabase.functions.invoke("send-meeting-invite", {
        body: { candidateId, jobTitle, category, message: body.trim(), subject: subject.trim() || defaultSubject(category, jobTitle), paymentRequestId: includePayment ? payReq?.id : null },
      });
      setSending(false);
      if (error) return toast.error(await errText(error));
      toast.success(`Mail sent to ${data?.email ?? "candidate"}`);
      setBody(""); setPrompt(""); setSubject(""); setPreview(false); loadLogs();
      return;
    }
    const trimmed = link.trim();
    if (!/^https:\/\/\S+$/.test(trimmed)) return toast.error("Paste a valid meeting link starting with https://");
    const host = (() => { try { return new URL(trimmed).hostname.toLowerCase(); } catch { return ""; } })();
    if (platform === "google_meet" && host !== "meet.google.com")
      return toast.error("That is not a Google Meet link. Open the meeting in Google Meet and copy the link starting with https://meet.google.com/ — calendar.app.google.com links are booking pages, not the meeting.");
    if (platform === "teams" && !host.includes("teams.microsoft.com") && !host.includes("teams.live.com"))
      return toast.error("That is not a Microsoft Teams link. Copy the join link starting with https://teams.microsoft.com/.");
    if (!when) return toast.error("Choose the interview date and time");
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-meeting-invite", {
      body: { candidateId, jobTitle, platform, meetingLink: link.trim(), scheduledAt, message: body.trim() || null, subject: subject.trim() || null, category, paymentRequestId: includePayment ? payReq?.id : null },
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
        <Label className="text-xs">Mail category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="z-[1600]">
            {Object.entries(CATEGORY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs pt-1 cursor-pointer">
          <input type="checkbox" checked={includePayment} disabled={!payReq} onChange={(e) => setIncludePayment(e.target.checked)} />
          Add payment link &amp; QR
          <span className="text-muted-foreground">
            {payReq ? `(₹${(payReq.amount_paise / 100).toLocaleString("en-IN")} request, ${payReq.status === "failed" ? "failed" : "awaiting payment"})` : "(no open payment request — send a payment mail first)"}
          </span>
        </label>
      </div>

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

      {isInterview && <div className="grid gap-2 sm:grid-cols-2">
        <Select value={platform} onValueChange={(v) => setPlatform(v as keyof typeof LABEL)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="z-[1600]">
            <SelectItem value="google_meet">Google Meet</SelectItem>
            <SelectItem value="teams">Microsoft Teams</SelectItem>
            <SelectItem value="other">Other link</SelectItem>
          </SelectContent>
        </Select>
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>}
      {isInterview && <Input placeholder={platform === "teams" ? "https://teams.microsoft.com/l/meetup-join/..." : "https://meet.google.com/abc-defg-hij"} value={link} onChange={(e) => setLink(e.target.value)} maxLength={1000} />}
      <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
      <Textarea rows={6} placeholder="Message (generate from the prompt above or write your own)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />

      {preview && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed space-y-2">
          <div className="text-xs text-muted-foreground">Subject: <span className="font-medium text-foreground">{subject || defaultSubject(category, jobTitle)}</span></div>
          <p>Dear Candidate,</p>
          {body.trim()
            ? <p className="whitespace-pre-wrap">{body}</p>
            : <p>We are pleased to invite you to an interview{jobTitle ? ` for ${jobTitle}` : ""}.</p>}
          {isInterview && <>
          <p><b>Date &amp; time:</b> {scheduledAt || "—"}<br /><b>Platform:</b> {LABEL[platform]}</p>
          <span className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground font-semibold">Join {LABEL[platform]}</span>
          <p className="text-xs text-muted-foreground break-all">{link || "Meeting link"}</p></>}
          {includePayment && payReq && (
            <div className="space-y-2">
              <p><b>Amount to pay:</b> ₹{(payReq.amount_paise / 100).toLocaleString("en-IN")}</p>
              <span className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground font-semibold">Pay ₹{(payReq.amount_paise / 100).toLocaleString("en-IN")}</span>
              {payReq.qr_image_url && <img src={payReq.qr_image_url} alt="Payment QR" className="h-32 w-32 border rounded" />}
            </div>
          )}
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
          {isInterview ? "Send Interview Invitation" : `Send ${CATEGORY[category]}`}
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="space-y-2 pt-1 border-t">
          <div className="text-xs font-semibold text-muted-foreground pt-2">Sent mails ({logs.length})</div>
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium text-foreground">{log.subject || "Mail"}</span>
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
              {log.meeting_link && <a
                href={log.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {log.meeting_link}
              </a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
