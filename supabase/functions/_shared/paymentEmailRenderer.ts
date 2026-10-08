const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));

export interface PaymentMailDraft { subject: string; body: string }
export interface PaymentMailContext {
  candidateName: string;
  jobTitle: string;
  amount: string;
  paymentUrl?: string;
  qrUrl?: string;
  upiQr?: boolean;
}

export function renderPaymentEmail(draft: PaymentMailDraft, context: PaymentMailContext) {
  const variables: Record<string, string> = { candidate_name: context.candidateName, job_title: context.jobTitle, amount: context.amount };
  const substitute = (text: string) => text.replace(/{{\s*(candidate_name|job_title|amount)\s*}}/g, (_, key: string) => variables[key] || "");
  const subject = substitute(draft.subject).replace(/[\r\n]/g, " ");
  const body = substitute(draft.body).split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n");
    const first = lines[0] || "";
    const heading = /^\d+\.\s/.test(first) || ["What’s Included with Your Registration", "Registration Fee"].includes(first);
    if (heading) return `<h3 style="margin:24px 0 10px;font-size:16px;color:#334155">${escapeHtml(first)}</h3>${lines.length > 1 ? `<p style="margin:0 0 16px">${lines.slice(1).map(escapeHtml).join("<br/>")}</p>` : ""}`;
    return `<p style="margin:0 0 16px">${lines.map(escapeHtml).join("<br/>")}</p>`;
  }).join("");
  const payment = context.paymentUrl
    ? `<a href="${escapeHtml(context.paymentUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Pay ${escapeHtml(context.amount)}</a>`
    : `<span style="display:inline-block;background:#0d9488;color:#fff;padding:13px 28px;border-radius:6px;font-weight:bold">Pay ${escapeHtml(context.amount)}</span>`;
  const qr = context.qrUrl
    ? `<img src="${escapeHtml(context.qrUrl)}" width="220" height="220" alt="Payment QR code" style="display:block;margin:16px auto;max-width:100%"/>`
    : `<div style="border:1px dashed #cbd5e1;padding:32px 16px;margin:16px 0;color:#64748b;text-align:center">Payment QR code appears in the sent email</div>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#334155"><div style="max-width:600px;margin:0 auto;padding:28px 24px;font-size:14px;line-height:1.7"><div style="font-size:24px;font-weight:bold;border-bottom:2px solid #0d9488;padding-bottom:16px;margin-bottom:24px">Gradia</div>${body}<div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:24px"><h3 style="margin:0 0 16px;font-size:16px">Secure payment · ${escapeHtml(context.amount)}</h3>${payment}<p style="margin:16px 0 8px">${context.upiQr ? `Scan the UPI QR in your UPI app to pay ${escapeHtml(context.amount)}.` : context.paymentUrl ? "Scan the QR with your phone camera to open the payment page." : "Your secure payment link and QR will be included when this email is sent."}</p>${qr}${context.paymentUrl ? `<p style="font-size:12px;word-break:break-all">Payment link: <a href="${escapeHtml(context.paymentUrl)}">${escapeHtml(context.paymentUrl)}</a></p>` : ""}<p style="font-size:12px;color:#64748b">Valid for 7 days. You’ll receive an email confirming the payment status.</p></div><div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:20px">Warm regards,<br/><b>Team Gradia</b><br/>Learn. Practice. Compete. Get Hired.<br/><a href="https://gradia.world" style="color:#0d9488">gradia.world</a><br/>noreply@gradia.co.in</div></div></body></html>`;
  return { subject, html };
}