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
    const content = heading ? lines.slice(1) : lines;
    let details = "";
    let bullets: string[] = [];
    const flushBullets = () => {
      if (bullets.length) details += `<ul style="margin:8px 0 16px;padding-left:20px">${bullets.map(line => `<li style="padding:0 0 5px">${escapeHtml(line)}</li>`).join("")}</ul>`;
      bullets = [];
    };
    for (const line of content) {
      if (/^[•]\s*/.test(line)) bullets.push(line.replace(/^[•]\s*/, ""));
      else { flushBullets(); details += `<p style="margin:0 0 14px">${escapeHtml(line)}</p>`; }
    }
    flushBullets();
    return `${heading ? `<h3 style="margin:22px 0 10px;font-size:16px;line-height:1.5;color:#263445">${escapeHtml(first)}</h3>` : ""}${details}`;
  }).join("");
  const payment = context.paymentUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td bgcolor="#0d9488" style="border-radius:4px;text-align:center"><a href="${escapeHtml(context.paymentUrl)}" style="display:inline-block;color:#ffffff;padding:14px 32px;border:1px solid #0d9488;border-radius:4px;text-decoration:none;font-size:15px;line-height:20px;font-weight:bold">Pay ${escapeHtml(context.amount)} securely</a></td></tr></table>`
    : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td bgcolor="#0d9488" style="padding:14px 32px;border-radius:4px;color:#ffffff;text-align:center;font-size:15px;font-weight:bold">Pay ${escapeHtml(context.amount)} securely</td></tr></table>`;
  const qr = context.qrUrl
    ? `<img src="${escapeHtml(context.qrUrl)}" width="260" alt="${context.upiQr ? "Scan to pay by UPI" : "Scan to open the payment page"}" style="display:block;margin:0 auto;width:260px;max-width:100%;height:auto;border:0"/>`
    : `<p style="margin:0;padding:20px 12px;border:1px dashed #cbd5e1;color:#64748b;font-size:13px">Your payment QR will appear here in the sent email.</p>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#334155">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Payment request of ${escapeHtml(context.amount)} for ${escapeHtml(context.jobTitle)}.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff"><tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;font-size:14px;line-height:1.65">
<tr><td style="padding:14px 16px 20px;border-bottom:2px solid #0d9488"><p style="margin:0;color:#263445;font-size:27px;line-height:34px;font-weight:bold">Gradia</p><p style="margin:4px 0 0;font-size:12px;color:#64748b">PAYMENT REQUEST</p></td></tr>
<tr><td style="padding:24px 16px 8px"><h1 style="margin:0 0 8px;font-size:21px;line-height:1.4;color:#263445">${escapeHtml(context.jobTitle)}</h1><p style="margin:0 0 22px;color:#64748b;font-size:13px">Registration payment · ${escapeHtml(context.amount)}</p>${body}</td></tr>
<tr><td style="padding:16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0"><tr><td align="center" style="padding:24px 12px">
<p style="margin:0 0 4px;color:#64748b;font-size:12px">AMOUNT TO PAY</p><p style="margin:0 0 18px;font-size:28px;line-height:36px;font-weight:bold;color:#263445">${escapeHtml(context.amount)}</p>${payment}
<p style="margin:20px 0 12px;font-size:13px;color:#64748b">${context.upiQr ? "Or scan the QR below with your UPI app." : "Or scan the QR below to open the secure payment page."}</p>${qr}
${context.paymentUrl ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#64748b">Button not opening? <a href="${escapeHtml(context.paymentUrl)}" style="color:#0d9488;text-decoration:underline">Open payment link</a></p>` : ""}
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#64748b">Payment link valid for 7 days.<br/>A confirmation email will be sent automatically once payment is received.</p>
</td></tr></table></td></tr>
<tr><td style="padding:8px 16px 20px"><p style="margin:0 0 8px">Warm regards,<br/><strong style="color:#263445">Team Gradia</strong></p><p style="margin:0;font-size:12px;color:#64748b">Learn. Practice. Compete. Get Hired.</p><p style="margin:6px 0 0;font-size:12px"><a href="https://gradia.world" style="color:#0d9488;text-decoration:none">gradia.world</a></p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}