// Shared logic for employer → candidate payment requests (Razorpay Payment Links).
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

export function rzpAuth() {
  const id = Deno.env.get("RAZORPAY_KEY_ID"), secret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!id || !secret) throw new Error("Payment gateway not configured");
  return "Basic " + btoa(`${id}:${secret}`);
}

export async function sendMail(to: string, subject: string, html: string, idempotencyKey?: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify({ from: "Gradia <noreply@gradia.co.in>", to: [to], subject, html }),
  });
  if (!r.ok) console.error("Resend failed", r.status, await r.text());
  return r.ok;
}

export const wrap = (body: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">${body}</div>`;

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
export { esc };

// Re-check a request with Razorpay, update its status and send success/failure mail once per status.
export async function syncPaymentRequest(admin: any, req: any, confirmedPayment?: { paymentId?: string }) {
  // Reload so duplicate webhook deliveries and profile refreshes share notification state.
  const { data: current, error: readError } = await admin.from("candidate_payment_requests").select("*").eq("id", req.id).single();
  if (readError) throw new Error("Unable to read payment request");
  req = current;
  if (!req?.razorpay_link_id || req.manually_updated) return req;
  const r = confirmedPayment ? null : await fetch(`https://api.razorpay.com/v1/payment_links/${req.razorpay_link_id}`, {
    headers: { Authorization: rzpAuth() },
  });
  if (r && !r.ok) throw new Error(`Payment link sync failed (${r.status})`);
  const link = r ? await r.json() : { status: "paid", payments: [] };
  const payments: any[] = link.payments || [];
  let status = req.status;
  let paymentId = confirmedPayment?.paymentId || req.razorpay_payment_id;
  if (link.status === "paid") {
    status = "paid";
    paymentId = payments.find((p) => p.status === "captured")?.payment_id || paymentId;
  } else if (link.status === "expired") status = "expired";
  else if (link.status === "cancelled") status = "cancelled";
  else if (payments.some((p) => p.status === "failed")) {
    status = "failed";
    paymentId = payments.filter((p) => p.status === "failed").pop()?.payment_id || paymentId;
  }

  // Paid via the UPI QR instead of the link?
  if (status !== "paid" && req.razorpay_qr_id) {
    const qr = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${req.razorpay_qr_id}/payments`, { headers: { Authorization: rzpAuth() } });
    if (qr.ok) {
      const items: any[] = (await qr.json()).items || [];
      const ok = items.find((p) => p.status === "captured" && p.amount >= req.amount_paise);
      if (ok) { status = "paid"; paymentId = ok.id; }
      else if (status === "sent" && items.some((p) => p.status === "failed")) { status = "failed"; paymentId = items.find((p) => p.status === "failed").id; }
    }
  }

  const shouldMail = (status === "paid" || status === "failed") && req.notified_status !== status;
  if (status === req.status && !shouldMail) return req;

  // Persist the payment before sending. A delivery failure must not hide a successful payment.
  const { error: statusError } = await admin.from("candidate_payment_requests")
    .update({ status, razorpay_payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq("id", req.id);
  if (statusError) throw new Error("Unable to save payment status");
  let notified = req.notified_status;
  if (shouldMail) {
    const { data: cand, error: candidateError } = await admin.from("profiles").select("full_name, email").eq("id", req.candidate_id).maybeSingle();
    if (candidateError || !cand?.email) throw new Error("Unable to find payment confirmation recipient");
    if (cand?.email) {
      const name = esc(cand.full_name || "Candidate");
      const role = req.job_title ? ` for <b>${esc(req.job_title)}</b>` : "";
      const ok = status === "paid"
        ? await sendMail(cand.email, "Payment successful – Gradia", wrap(
            `<h2>Hello ${name},</h2><p>Your payment of <b>${rupees(req.amount_paise)}</b>${role} was received successfully.</p>
              <p style="font-size:13px;color:#666">Payment ID: ${esc(paymentId || "-")}</p>`), `payment-request-${req.id}-${status}`)
        : await sendMail(cand.email, "Payment failed – Gradia", wrap(
            `<h2>Hello ${name},</h2><p>Your payment of <b>${rupees(req.amount_paise)}</b>${role} did not go through. No money was taken, or any deducted amount will be refunded by your bank.</p>
             ${req.payment_url ? `<p><a href="${esc(req.payment_url)}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Try again</a></p>` : ""}`), `payment-request-${req.id}-${status}`);
      if (!ok) throw new Error("Payment status email could not be delivered");
      if (ok) notified = status;
    }
  }
  const { data, error: updateError } = await admin.from("candidate_payment_requests")
    .update({ status, razorpay_payment_id: paymentId, notified_status: notified, updated_at: new Date().toISOString() })
    .eq("id", req.id).select().single();
  if (updateError) throw new Error("Unable to save payment notification status");
  return data || req;
}
