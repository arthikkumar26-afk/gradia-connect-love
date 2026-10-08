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

const PAYMENT_MARKER = /{{\s*payment_section\s*}}/;
const P = "margin:0 0 4px";

// Bold the "Title" part of "Title – description" (or "Label: text") for list items and notes.
const boldLead = (line: string) => {
  const dash = line.match(/^(.{2,90}?)\s+[–—-]\s+(.+)$/);
  if (dash) return `<strong>${escapeHtml(dash[1])}</strong> – ${escapeHtml(dash[2])}`;
  const colon = line.match(/^(Please note:|Note:)\s*(.+)$/i);
  if (colon) return `<strong>${escapeHtml(colon[1])}</strong> ${escapeHtml(colon[2])}`;
  return escapeHtml(line);
};

function renderText(text: string) {
  return text.split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    let html = "";
    let list: { kind: "ol" | "ul"; items: string[] } | null = null;
    const flush = () => {
      if (!list) return;
      const style = list.kind === "ol" ? "margin:0 0 4px;padding-left:24px" : "margin:0 0 4px;padding-left:22px";
      html += `<${list.kind} style="${style}">${list.items.map((i) => `<li style="margin:0 0 2px">${i}</li>`).join("")}</${list.kind}>`;
      list = null;
    };
    lines.forEach((line, idx) => {
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      const bullet = line.match(/^[•*-]\s+(.+)$/);
      if (numbered) {
        if (list?.kind !== "ol") { flush(); list = { kind: "ol", items: [] }; }
        list!.items.push(boldLead(numbered[1]));
      } else if (bullet && list?.kind === "ol" && list.items.length) {
        // Sub-points under a numbered item continue that item's sentence.
        list.items[list.items.length - 1] += `${list.items[list.items.length - 1].includes(" – ") ? ", " : " – "}${escapeHtml(bullet[1])}`;
      } else if (bullet) {
        if (list?.kind !== "ul") { flush(); list = { kind: "ul", items: [] }; }
        list!.items.push(escapeHtml(bullet[1]));
      } else {
        flush();
        const isLabel = /:$/.test(line) || (idx === 0 && lines.length > 1 && line.length < 70 && !/[.,!?]$/.test(line));
        html += isLabel
          ? `<p style="${P};font-weight:bold">${escapeHtml(line.replace(/:?$/, ":"))}</p>`
          : `<p style="${P}">${boldLead(line)}</p>`;
      }
    });
    flush();
    return `<div style="margin:0 0 14px">${html}</div>`;
  }).join("");
}

export function renderPaymentEmail(draft: PaymentMailDraft, context: PaymentMailContext) {
  const variables: Record<string, string> = { candidate_name: context.candidateName, job_title: context.jobTitle, amount: context.amount };
  const substitute = (text: string) => text.replace(/{{\s*(candidate_name|job_title|amount)\s*}}/g, (_, key: string) => variables[key] || "");
  const subject = substitute(draft.subject).replace(/[\r\n]/g, " ");

  // Split on the payment marker before substituting so candidate data can't move the payment block.
  const [beforeRaw, ...rest] = draft.body.split(PAYMENT_MARKER);
  const before = renderText(substitute(beforeRaw));
  const after = rest.length ? renderText(substitute(rest.join("\n\n"))) : "";

  const button = context.paymentUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 10px"><tr><td bgcolor="#0f9488" style="border-radius:6px"><a href="${escapeHtml(context.paymentUrl)}" target="_blank" style="display:inline-block;padding:10px 46px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px">Pay ${escapeHtml(context.amount)}</a></td></tr></table>`
    : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 10px"><tr><td bgcolor="#0f9488" style="padding:10px 46px;border-radius:6px;color:#ffffff;font-size:14px;font-weight:bold">Pay ${escapeHtml(context.amount)}</td></tr></table>`;
  const qrText = context.upiQr
    ? "Or scan this QR code with any UPI app (GPay, PhonePe, Paytm) to pay directly:"
    : "Or scan this QR code with your phone camera to open the payment page:";
  const qr = context.qrUrl
    ? `<img src="${escapeHtml(context.qrUrl)}" width="140" height="140" alt="Payment QR code" style="display:block;width:140px;height:140px;border:0;margin:4px 0 10px"/>`
    : `<p style="margin:4px 0 10px;color:#6b7280;font-size:13px">[Payment QR code is added here in the sent email]</p>`;
  const payment = `<div style="margin:0 0 14px"><p style="${P};font-weight:bold">Payment Link:</p>${button}<p style="${P}">${qrText}</p>${qr}<p style="margin:0;font-size:13px;color:#4b5563">This payment link is valid for 7 days. You will receive a confirmation email automatically once your payment is received.</p></div>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:0;background:#ffffff">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Payment request of ${escapeHtml(context.amount)} for ${escapeHtml(context.jobTitle)}.</div>
<div style="padding:8px 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222222;max-width:900px">
${before}${payment}${after}
<p style="margin:0">Warm regards,</p>
<p style="margin:0;font-weight:bold">Team Gradia</p>
<p style="margin:0"><a href="https://gradia.world" style="color:#1a56db;font-weight:bold">Learn. Practice. Compete. Get Hired.</a></p>
<p style="margin:0"><a href="https://gradia.world" style="color:#1a56db">gradia.world</a></p>
<p style="margin:0"><a href="mailto:noreply@gradia.co.in" style="color:#1a56db">noreply@gradia.co.in</a></p>
</div></body></html>`;
  return { subject, html };
}
