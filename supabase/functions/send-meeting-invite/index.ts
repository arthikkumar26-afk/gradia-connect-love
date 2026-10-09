import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  candidateId: z.string().uuid(),
  jobTitle: z.string().max(200).optional().nullable(),
  platform: z.enum(["google_meet", "teams", "other"]),
  meetingLink: z.string().url().max(1000).refine((v) => v.startsWith("https://"), "Link must start with https://"),
  scheduledAt: z.string().min(1).max(100),
  message: z.string().max(5000).optional().nullable(),
  subject: z.string().max(200).optional().nullable(),
});
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const LABEL = { google_meet: "Google Meet", teams: "Microsoft Teams", other: "Online meeting" } as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles || []).some((r: any) => ["employer", "hr", "hr_manager", "admin", "owner"].includes(r.role)))
      return json({ error: "Only employers can send interview invitations." }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Please check the meeting link and date." }, 400);
    const { candidateId, jobTitle, platform, meetingLink, scheduledAt, message, subject } = parsed.data;

    const { data: cand } = await admin.from("profiles").select("full_name,email").eq("id", candidateId).maybeSingle();
    if (!cand?.email) return json({ error: "Candidate has no email address." }, 400);
    const { data: emp } = await admin.from("profiles").select("company_name,full_name").eq("id", u.user.id).maybeSingle();
    const company = esc(emp?.company_name || emp?.full_name || "Gradia");
    const label = LABEL[platform];
    const link = esc(meetingLink);
    // Collapse hard line wraps so paragraphs fill the full width; keep blank lines as paragraph breaks
    const note = message
      ? `<p>${esc(message)
          .split(/\n{2,}/)
          .map((para) => para.replace(/\n/g, " ").trim())
          .filter(Boolean)
          .join("</p><p>")}</p>`
      : "";

    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;max-width:600px;color:#222;line-height:1.6">
<p>Dear ${esc(cand.full_name || "Candidate")},</p>
${message ? "" : `<p>Thank you for completing your registration. We are pleased to invite you to an interview${jobTitle ? ` for <b>${esc(jobTitle)}</b>` : ""} with ${company}.</p>`}
${note}
<table style="border-collapse:collapse;margin:12px 0">
<tr><td style="padding:4px 12px 4px 0"><b>Date &amp; time:</b></td><td>${esc(scheduledAt)}</td></tr>
<tr><td style="padding:4px 12px 4px 0"><b>Platform:</b></td><td>${label}</td></tr>
</table>
<p><a href="${link}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Join ${label}</a></p>
<p style="font-size:13px;color:#555">If the button doesn't work, open: ${link}</p>
<p>Please join a few minutes early with a stable internet connection, camera and microphone.</p>
<p>Best regards,<br><b>${company}</b><br>via Gradia · gradia.world</p></div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Gradia <noreply@gradia.co.in>", to: [cand.email], subject: subject || `Interview Invitation${jobTitle ? ` – ${jobTitle}` : ""}`, html }),
    });
    if (!r.ok) { const t = await r.text(); console.error(r.status, t); return json({ error: "Email failed to send", details: t }, 502); }
    return json({ success: true, email: cand.email });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
