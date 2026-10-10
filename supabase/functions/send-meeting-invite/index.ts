import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  candidateId: z.string().uuid(),
  jobTitle: z.string().max(200).optional().nullable(),
  category: z.enum(["interview", "payment_reminder", "follow_up"]).optional().default("interview"),
  paymentRequestId: z.string().uuid().optional().nullable(),
  platform: z.enum(["google_meet", "teams", "other"]).optional().default("other"),
  meetingLink: z.string().url().max(1000).refine((v) => v.startsWith("https://"), "Link must start with https://").optional().nullable(),
  scheduledAt: z.string().min(1).max(100).optional().nullable(),
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
    const { candidateId, jobTitle, platform, meetingLink, scheduledAt, message, subject, category, paymentRequestId } = parsed.data;
    const isInterview = category === "interview";
    if (isInterview && (!meetingLink || !scheduledAt)) return json({ error: "Please add the meeting link and date." }, 400);
    if (!isInterview && !message) return json({ error: "Please write the message." }, 400);
    const defaultSubject = (isInterview ? "Interview Invitation" : category === "payment_reminder" ? "Payment Reminder" : "Update on your application") + (jobTitle ? ` – ${jobTitle}` : "");

    let pay: any = null;
    if (paymentRequestId) {
      const { data } = await admin.from("candidate_payment_requests")
        .select("id, amount_paise, payment_url, qr_image_url, status, candidate_id, employer_id")
        .eq("id", paymentRequestId).maybeSingle();
      if (!data || data.candidate_id !== candidateId || data.employer_id !== u.user.id || !data.payment_url)
        return json({ error: "Payment request not found for this candidate." }, 400);
      if (!["sent", "failed"].includes(data.status)) return json({ error: "This payment request is no longer open." }, 400);
      pay = data;
    }

    // Platform-specific link checks so the candidate gets a joinable meeting link,
    // not a calendar/booking page (e.g. calendar.app.google.com is NOT a Meet link)
    const host = isInterview ? new URL(meetingLink!).hostname.toLowerCase() : "";
    if (isInterview && platform === "google_meet" && host !== "meet.google.com")
      return json({ error: "That is not a Google Meet link. Open your meeting in Google Meet and copy the link that starts with https://meet.google.com/ — calendar.app.google.com links are booking pages, not the meeting itself." }, 400);
    if (isInterview && platform === "teams" && !host.includes("teams.microsoft.com") && !host.includes("teams.live.com"))
      return json({ error: "That is not a Microsoft Teams meeting link. Copy the join link that starts with https://teams.microsoft.com/." }, 400);

    const { data: cand } = await admin.from("profiles").select("full_name,email").eq("id", candidateId).maybeSingle();
    if (!cand?.email) return json({ error: "Candidate has no email address." }, 400);
    const { data: emp } = await admin.from("profiles").select("company_name,full_name").eq("id", u.user.id).maybeSingle();
    const company = esc(emp?.company_name || emp?.full_name || "Gradia");
    const label = LABEL[platform];
    const link = esc(meetingLink || "");
    const amt = pay ? "₹" + (pay.amount_paise / 100).toLocaleString("en-IN") : "";
    const paySection = pay ? `<p style="margin-top:16px"><b>Amount to pay:</b> ${amt}</p>
<p><b>Payment Link:</b><br><a href="${esc(pay.payment_url)}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:6px">Pay ${amt}</a></p>
${pay.qr_image_url ? `<p><b>Or scan to pay with any UPI app:</b><br><img src="${esc(pay.qr_image_url)}" width="160" height="160" alt="Payment QR" style="display:block;margin-top:6px;border:1px solid #ddd"></p>` : ""}
<p style="font-size:13px;color:#555">If the button doesn't work, open: ${esc(pay.payment_url)}</p>` : "";
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
${message || !isInterview ? "" : `<p>Thank you for completing your registration. We are pleased to invite you to an interview${jobTitle ? ` for <b>${esc(jobTitle)}</b>` : ""} with ${company}.</p>`}
${note}
${isInterview ? `<table style="border-collapse:collapse;margin:12px 0">
<tr><td style="padding:4px 12px 4px 0"><b>Date &amp; time:</b></td><td>${esc(scheduledAt!)}</td></tr>
<tr><td style="padding:4px 12px 4px 0"><b>Platform:</b></td><td>${label}</td></tr>
</table>
<p><a href="${link}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Join ${label}</a></p>
<p style="font-size:13px;color:#555">If the button doesn't work, open: ${link}</p>
<p>Please join a few minutes early with a stable internet connection, camera and microphone.</p>` : ""}
${paySection}
<p>Best regards,<br><b>${company}</b><br>via Gradia · gradia.world</p></div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Gradia <noreply@gradia.co.in>", to: [cand.email], subject: subject || defaultSubject, html }),
    });
    if (!r.ok) { const t = await r.text(); console.error(r.status, t); return json({ error: "Email failed to send", details: t }, 502); }

    // Record the sent invitation so the employer sees the mail history in the app
    await admin.from("interview_invitation_logs").insert({
      employer_id: u.user.id,
      candidate_id: candidateId,
      job_title: jobTitle ?? null,
      platform,
      meeting_link: meetingLink || pay?.payment_url || "",
      scheduled_at: scheduledAt ?? null,
      subject: subject || defaultSubject,
      message: message ?? null,
    });

    return json({ success: true, email: cand.email });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
