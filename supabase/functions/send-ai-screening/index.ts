import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  action: z.enum(["send", "cancel", "resend", "reschedule"]).optional().default("send"),
  candidateId: z.string().uuid(),
  sessionId: z.string().uuid().optional().nullable(),
  jobTitle: z.string().max(200).optional().nullable(),
  appUrl: z.string().url().max(300).optional().nullable(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const sendMail = async (to: string, subject: string, html: string) => {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Gradia <noreply@gradia.co.in>", to: [to], subject, html }),
  });
  if (!r.ok) console.error("Resend failed", r.status, await r.text());
  return r.ok;
};

const inviteHtml = (name: string, role: string, link: string, rescheduled: boolean) =>
  `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
    <h2>Hello ${name},</h2>
    <p>${rescheduled ? "Your AI screening round" + role + " has been rescheduled. Please use the new link below — any earlier link is no longer valid." : "You have been invited to an AI screening round" + role + ". Please sign in to Gradia and complete it. Your camera and screen will be recorded for the employer's review."}</p>
    <p><a href="${link}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Start Screening Round</a></p>
    <p style="font-size:13px;color:#666">If the button doesn't work, open: ${link}</p></div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Please sign in again." }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = (roles || []).some((r: any) => ["employer", "hr", "hr_manager", "admin", "owner"].includes(r.role));
    if (!allowed) return json({ error: "Only employers can manage screening rounds." }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, candidateId, sessionId, jobTitle, appUrl } = parsed.data;

    const { data: cand } = await admin.from("profiles").select("full_name,email").eq("id", candidateId).maybeSingle();
    if (!cand?.email) return json({ error: "Candidate has no email address." }, 400);

    const base = appUrl || "https://gradia.world";
    const name = esc(cand.full_name || "Candidate");
    const role = jobTitle ? ` for <b>${esc(jobTitle)}</b>` : "";
    const subject = `AI Screening Round${jobTitle ? ` – ${jobTitle}` : ""}`;

    if (action === "send") {
      const { data: sess, error: sErr } = await admin
        .from("mock_interview_sessions")
        .insert({ candidate_id: candidateId, status: "pending", current_stage_order: 1, interview_type: "ai_screening", points_paid: true })
        .select("id")
        .single();
      if (sErr) throw sErr;
      const link = `${base}/candidate/mock-interview/${sess.id}/1`;
      const emailSent = await sendMail(cand.email, subject, inviteHtml(name, role, link, false));
      return json({ sessionId: sess.id, emailSent });
    }

    // cancel / resend / reschedule act on an existing active session
    let query = admin
      .from("mock_interview_sessions")
      .select("id,status")
      .eq("candidate_id", candidateId)
      .eq("interview_type", "ai_screening")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (sessionId) query = admin.from("mock_interview_sessions").select("id,status").eq("id", sessionId).limit(1);
    const { data: found } = await query.maybeSingle();
    if (!found) return json({ error: "No active screening round found for this candidate." }, 404);

    if (action === "cancel") {
      const { error: cErr } = await admin.from("mock_interview_sessions").update({ status: "cancelled" }).eq("id", found.id);
      if (cErr) throw cErr;
      const emailSent = await sendMail(
        cand.email,
        `AI Screening Round Cancelled${jobTitle ? ` – ${jobTitle}` : ""}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
          <h2>Hello ${name},</h2>
          <p>Your AI screening round${role} has been cancelled by the employer. You no longer need to complete it. If a new round is scheduled, you will receive a fresh invitation.</p>
          <p style="font-size:13px;color:#666">— Team Gradia</p></div>`
      );
      return json({ sessionId: found.id, cancelled: true, emailSent });
    }

    if (action === "resend") {
      const link = `${base}/candidate/mock-interview/${found.id}/1`;
      const emailSent = await sendMail(cand.email, subject, inviteHtml(name, role, link, false));
      return json({ sessionId: found.id, resent: true, emailSent });
    }

    // reschedule: cancel the old session, create a fresh one, email the new link
    await admin.from("mock_interview_sessions").update({ status: "cancelled" }).eq("id", found.id);
    const { data: sess, error: sErr } = await admin
      .from("mock_interview_sessions")
      .insert({ candidate_id: candidateId, status: "pending", current_stage_order: 1, interview_type: "ai_screening", points_paid: true })
      .select("id")
      .single();
    if (sErr) throw sErr;
    const link = `${base}/candidate/mock-interview/${sess.id}/1`;
    const emailSent = await sendMail(cand.email, `Rescheduled: ${subject}`, inviteHtml(name, role, link, true));
    return json({ sessionId: sess.id, rescheduled: true, emailSent });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not process the screening request." }, 500);
  }
});
