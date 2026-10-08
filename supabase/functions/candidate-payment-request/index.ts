// Employer sends a payment request mail to a candidate (action "send"),
// or lists/refreshes request statuses for a candidate (action "list").
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { esc, rupees, rzpAuth, sendMail, syncPaymentRequest, wrap } from "../_shared/candidatePaymentRequests.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    candidateId: z.string().uuid(),
    amount: z.number().min(1).max(500000),
    jobId: z.string().uuid().nullable().optional(),
    jobTitle: z.string().max(200).nullable().optional(),
  }),
  z.object({ action: z.literal("list"), candidateId: z.string().uuid().optional() }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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

    if (b.action === "list") {
      let q = admin.from("candidate_payment_requests").select("*").eq("employer_id", user.id)
        .order("created_at", { ascending: false }).limit(200);
      if (b.candidateId) q = q.eq("candidate_id", b.candidateId);
      const { data: rows } = await q;
      const out = [];
      for (const r of rows || []) out.push(r.status === "sent" || r.status === "failed" ? await syncPaymentRequest(admin, r) : r);
      return json({ requests: out });
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
    const name = esc(cand.full_name || "Candidate");
    const role = b.jobTitle ? ` for <b>${esc(b.jobTitle)}</b>` : "";
    const emailSent = await sendMail(cand.email, `Payment request ${rupees(amountPaise)}${b.jobTitle ? ` – ${b.jobTitle}` : ""}`, wrap(
      `<h2>Hello ${name},</h2>
       <p>You have a payment request of <b>${rupees(amountPaise)}</b>${role}.</p>
       <p>Pay securely using UPI, cards, net banking or wallets:</p>
       <p><a href="${link.short_url}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Pay ${rupees(amountPaise)}</a></p>
       <p>${upiQr ? `Or scan this UPI QR in GPay, PhonePe, Paytm or any UPI app — the amount ${rupees(amountPaise)} is filled in automatically:` : "Or scan this QR code with your phone camera to open the payment page:"}</p>
       <p><img src="${qr}" width="260" alt="Payment QR code" style="max-width:260px" /></p>
       <p style="font-size:13px;color:#666">Link: ${link.short_url}<br/>This link is valid for 7 days. You'll get a confirmation email after paying.</p>`));

    return json({ ok: true, emailSent, request: { ...row, razorpay_link_id: link.id, payment_url: link.short_url } });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || "Failed" }, 500);
  }
});
