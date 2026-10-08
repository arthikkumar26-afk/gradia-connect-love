// Employer sends a payment request mail to a candidate (action "send"),
// or lists/refreshes request statuses for a candidate (action "list").
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { rupees, rzpAuth, sendMail, syncPaymentRequest } from "../_shared/candidatePaymentRequests.ts";
import { renderPaymentEmail } from "../_shared/paymentEmailRenderer.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    candidateId: z.string().uuid(),
    amount: z.number().min(1).max(500000),
    jobId: z.string().uuid().nullable().optional(),
    jobTitle: z.string().max(200).nullable().optional(),
    mailSubject: z.string().trim().min(1).max(250).optional(),
    mailBody: z.string().trim().min(1).max(15000).optional(),
  }),
  z.object({ action: z.literal("preview"), candidateId: z.string().uuid(), amount: z.number().min(1).max(500000), jobTitle: z.string().max(200).nullable().optional(), mailSubject: z.string().trim().min(1).max(250), mailBody: z.string().trim().min(1).max(15000) }),
  z.object({ action: z.literal("templates") }),
  z.object({ action: z.literal("save_template"), id: z.string().uuid().optional(), name: z.string().trim().min(1).max(100), subject: z.string().trim().min(1).max(250), body: z.string().trim().min(1).max(15000) }),
  z.object({ action: z.literal("delete_template"), id: z.string().uuid() }),
  z.object({ action: z.literal("list"), candidateId: z.string().uuid().optional() }),
  z.object({
    action: z.literal("set_status"),
    requestId: z.string().uuid(),
    status: z.enum(["paid", "cancelled", "failed", "sent"]),
    note: z.string().max(300).optional(),
  }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Service unavailable" }, 500);
    const admin = createClient(url, key);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = ["employer", "hr", "hr_manager", "admin", "owner"];
    if (!roles?.some((r: any) => allowed.includes(r.role))) return json({ error: "Forbidden" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    if (b.action === "templates") {
      const { data, error } = await admin.from("payment_email_templates").select("id,name,subject,body").eq("owner_id", user.id).order("created_at");
      if (error) throw error;
      return json({ templates: data || [] });
    }
    if (b.action === "save_template") {
      const values = { name: b.name, subject: b.subject, body: b.body, updated_at: new Date().toISOString() };
      const query = b.id ? admin.from("payment_email_templates").update(values).eq("id", b.id).eq("owner_id", user.id) : admin.from("payment_email_templates").insert({ ...values, owner_id: user.id });
      const { data, error } = await query.select("id,name,subject,body").single();
      if (error) throw error;
      return json({ ok: true, template: data });
    }
    if (b.action === "delete_template") {
      const { error } = await admin.from("payment_email_templates").delete().eq("id", b.id).eq("owner_id", user.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (b.action === "preview") {
      const { data: candidate } = await admin.from("profiles").select("full_name,email").eq("id", b.candidateId).maybeSingle();
      if (!candidate?.email) return json({ error: "Candidate has no email address" }, 400);
      return json({ ...renderPaymentEmail({ subject: b.mailSubject, body: b.mailBody }, { candidateName: candidate.full_name || "Candidate", jobTitle: b.jobTitle || "Internship Program", amount: rupees(Math.round(b.amount * 100)) }), recipient: candidate.email });
    }

    if (b.action === "list") {
      let q = admin.from("candidate_payment_requests").select("*").eq("employer_id", user.id)
        .order("created_at", { ascending: false }).limit(200);
      if (b.candidateId) q = q.eq("candidate_id", b.candidateId);
      const { data: rows } = await q;
      const out = [];
      for (const r of rows || []) out.push(!r.manually_updated && (r.status === "sent" || r.status === "failed") ? await syncPaymentRequest(admin, r) : r);
      return json({ requests: out });
    }

    if (b.action === "set_status") {
      const { data: pr } = await admin.from("candidate_payment_requests").select("*")
        .eq("id", b.requestId).eq("employer_id", user.id).maybeSingle();
      if (!pr) return json({ error: "Request not found" }, 404);
      // Cancelling also closes the payment link and UPI QR so the candidate can't pay anymore.
      if (b.status === "cancelled") {
        if (pr.razorpay_link_id) await fetch(`https://api.razorpay.com/v1/payment_links/${pr.razorpay_link_id}/cancel`, { method: "POST", headers: { Authorization: rzpAuth() } }).then((r) => r.text()).catch(() => {});
        if (pr.razorpay_qr_id) await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${pr.razorpay_qr_id}/close`, { method: "POST", headers: { Authorization: rzpAuth() } }).then((r) => r.text()).catch(() => {});
      }
      const { data: upd, error } = await admin.from("candidate_payment_requests").update({
        status: b.status, manually_updated: b.status !== "sent", manual_note: b.note || null,
        updated_at: new Date().toISOString(),
      }).eq("id", pr.id).select().single();
      if (error) throw error;
      return json({ ok: true, request: upd });
    }

    const { data: cand } = await admin.from("profiles").select("full_name, email, mobile").eq("id", b.candidateId).maybeSingle();
    if (!cand?.email) return json({ error: "Candidate has no email address" }, 400);
    const amountPaise = Math.round(b.amount * 100);

    const { data: row, error: insErr } = await admin.from("candidate_payment_requests").insert({
      employer_id: user.id, candidate_id: b.candidateId, job_id: b.jobId || null,
      job_title: b.jobTitle || null, amount_paise: amountPaise,
    }).select().single();
    if (insErr) throw insErr;

    const lr = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: { Authorization: rzpAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountPaise, currency: "INR", accept_partial: false,
        description: (b.jobTitle ? `Payment – ${b.jobTitle}` : "Payment to Gradia").slice(0, 2048),
        customer: { name: cand.full_name || undefined, email: cand.email },
        notify: { email: false, sms: false }, reminder_enable: false,
        expire_by: Math.floor(Date.now() / 1000) + 7 * 86400,
        reference_id: row.id,
        notes: { payment_request_id: row.id, candidate_id: b.candidateId, employer_id: user.id },
      }),
    });
    if (!lr.ok) {
      const t = await lr.text();
      console.error("Payment link failed", lr.status, t);
      await admin.from("candidate_payment_requests").delete().eq("id", row.id);
      return json({ error: "Could not create payment link", details: t }, 502);
    }
    const link = await lr.json();
    await admin.from("candidate_payment_requests")
      .update({ razorpay_link_id: link.id, payment_url: link.short_url }).eq("id", row.id);

    // UPI QR: scanning in GPay/PhonePe/Paytm shows the fixed amount directly.
    let qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link.short_url)}`;
    let upiQr = false;
    const qrRes = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: { Authorization: rzpAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "upi_qr", name: "Gradia", usage: "single_use", fixed_amount: true,
        payment_amount: amountPaise, description: (b.jobTitle || "Payment").slice(0, 100),
        close_by: Math.floor(Date.now() / 1000) + 7 * 86400,
        notes: { payment_request_id: row.id },
      }),
    });
    if (qrRes.ok) {
      const q = await qrRes.json();
      qr = q.image_url; upiQr = true;
      await admin.from("candidate_payment_requests").update({ razorpay_qr_id: q.id, qr_image_url: q.image_url }).eq("id", row.id);
    } else console.error("UPI QR failed", qrRes.status, await qrRes.text());
    const email = renderPaymentEmail({
      subject: b.mailSubject || "Payment Request {{amount}} – {{job_title}}",
      body: b.mailBody || "Dear {{candidate_name}},\n\nYou have a payment request of {{amount}} for {{job_title}}.\n\nPlease complete your payment below. Thank you.",
    }, { candidateName: cand.full_name || "Candidate", jobTitle: b.jobTitle || "Internship Program", amount: rupees(amountPaise), paymentUrl: link.short_url, qrUrl: qr, upiQr });
    const emailSent = await sendMail(cand.email, email.subject, email.html);

    return json({ ok: true, emailSent, request: { ...row, razorpay_link_id: link.id, payment_url: link.short_url } });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || "Failed" }, 500);
  }
});
