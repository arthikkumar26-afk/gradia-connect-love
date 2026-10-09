import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { candidateId: string; jobTitle?: string | null }

export default function MeetingInvitePanel({ candidateId, jobTitle }: Props) {
  const [platform, setPlatform] = useState<"google_meet" | "teams" | "other">("google_meet");
  const [link, setLink] = useState("");
  const [when, setWhen] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!/^https:\/\/\S+$/.test(link.trim())) return toast.error("Paste a valid meeting link starting with https://");
    if (!when) return toast.error("Choose the interview date and time");
    setSending(true);
    const scheduledAt = new Date(when).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }) + " IST";
    const { data, error } = await supabase.functions.invoke("send-meeting-invite", {
      body: { candidateId, jobTitle, platform, meetingLink: link.trim(), scheduledAt, message: message.trim() || null },
    });
    setSending(false);
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error || msg; } catch { /* ignore */ } }
      return toast.error(typeof msg === "string" ? msg : "Could not send invitation");
    }
    toast.success(`Interview invitation sent to ${data?.email ?? "candidate"}`);
    setLink(""); setMessage("");
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold text-sm"><Video className="h-4 w-4" /> Interview invitation</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
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
      <Textarea rows={3} placeholder="Optional note for the candidate (e.g. interviewer name, what to prepare)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} />
      <div className="flex justify-end">
        <Button onClick={send} disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Send Interview Invitation
        </Button>
      </div>
    </div>
  );
}
