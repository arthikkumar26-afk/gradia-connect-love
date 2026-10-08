// Builds a PDF invoice/receipt for a paid candidate payment request.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

export interface InvoiceData {
  requestId: string;
  paymentId: string;
  linkId?: string | null;
  paidAt: Date;
  amountPaise: number;
  itemTitle: string;
  candidate: { name: string; email: string; phone?: string | null };
  company?: { name?: string | null; email?: string | null; phone?: string | null; website?: string | null } | null;
}

// Standard PDF fonts only support basic Latin characters.
const clean = (s: string) => s.replace(/₹/g, "Rs. ").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E]/g, "");
const money = (paise: number) => `Rs. ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function invoiceNumber(d: InvoiceData) {
  const y = d.paidAt.toISOString().slice(0, 10).replace(/-/g, "");
  return `GRD-${y}-${d.requestId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function buildInvoicePdf(d: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const teal = rgb(0.06, 0.58, 0.53), dark = rgb(0.13, 0.13, 0.13), grey = rgb(0.42, 0.45, 0.5), line = rgb(0.86, 0.88, 0.9);
  const text = (t: string, x: number, y: number, o: { size?: number; b?: boolean; color?: any } = {}) =>
    page.drawText(clean(t), { x, y, size: o.size || 10, font: o.b ? bold : font, color: o.color || dark });
  const right = (t: string, xr: number, y: number, o: { size?: number; b?: boolean; color?: any } = {}) => {
    const s = clean(t); const w = (o.b ? bold : font).widthOfTextAtSize(s, o.size || 10);
    text(s, xr - w, y, o);
  };
  const wrapLines = (t: string, max: number, size = 10) => {
    const words = clean(t).split(" "); const out: string[] = []; let cur = "";
    for (const w of words) { const n = cur ? `${cur} ${w}` : w; if (font.widthOfTextAtSize(n, size) > max && cur) { out.push(cur); cur = w; } else cur = n; }
    if (cur) out.push(cur); return out;
  };

  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: teal });
  text("Gradia", 40, 808, { size: 22, b: true, color: rgb(1, 1, 1) });
  right("INVOICE / PAYMENT RECEIPT", 555, 812, { size: 12, b: true, color: rgb(1, 1, 1) });

  const inv = invoiceNumber(d);
  const date = d.paidAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  let y = 760;
  text("Invoice No:", 40, y, { b: true }); text(inv, 115, y);
  right(`Date: ${date} IST`, 555, y);
  y -= 16; text("Status:", 40, y, { b: true }); text("PAID", 115, y, { b: true, color: teal });

  y -= 34;
  text("BILLED BY", 40, y, { size: 9, b: true, color: grey }); text("BILLED TO", 320, y, { size: 9, b: true, color: grey });
  y -= 16;
  const by = ["Gradia", "Offices: Bangalore & Hyderabad, India", "Email: info@gradiaa.com", "Website: gradia.world"];
  const co = d.company;
  if (co?.name) by.push(`On behalf of: ${co.name}`);
  if (co?.email) by.push(`Company email: ${co.email}`);
  if (co?.phone) by.push(`Company phone: ${co.phone}`);
  if (co?.website) by.push(`Company website: ${co.website}`);
  const to = [d.candidate.name, d.candidate.email, ...(d.candidate.phone ? [`Phone: ${d.candidate.phone}`] : [])];
  by.forEach((l, i) => text(l, 40, y - i * 14, { b: i === 0 }));
  to.forEach((l, i) => text(l, 320, y - i * 14, { b: i === 0 }));
  y -= Math.max(by.length, to.length) * 14 + 20;

  // Items table
  page.drawRectangle({ x: 40, y: y - 6, width: 515, height: 22, color: rgb(0.94, 0.97, 0.97) });
  text("#", 48, y, { b: true }); text("Description", 70, y, { b: true }); text("Qty", 400, y, { b: true }); right("Amount", 547, y, { b: true });
  y -= 24;
  const desc = wrapLines(`${d.itemTitle} - One-time registration fee`, 310);
  text("1", 48, y); desc.forEach((l, i) => text(l, 70, y - i * 13)); text("1", 403, y); right(money(d.amountPaise), 547, y);
  y -= desc.length * 13 + 10;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: line });
  y -= 18; text("Subtotal", 380, y); right(money(d.amountPaise), 547, y);
  y -= 18; text("Total Paid", 380, y, { b: true, size: 12 }); right(money(d.amountPaise), 547, y, { b: true, size: 12 });

  y -= 40;
  text("PAYMENT DETAILS", 40, y, { size: 9, b: true, color: grey });
  y -= 16;
  const rows: [string, string][] = [["Transaction ID", d.paymentId], ["Payment method", "Online - Razorpay (UPI / Card / Net banking)"], ["Reference", d.linkId || d.requestId], ["Paid on", `${date} IST`]];
  rows.forEach(([k, v], i) => { text(`${k}:`, 40, y - i * 15, { b: true }); text(v, 150, y - i * 15); });
  y -= rows.length * 15 + 30;

  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: line });
  y -= 16;
  wrapLines("This is a computer-generated invoice and does not require a signature. Please keep it for your records. For any questions about this payment, write to info@gradiaa.com quoting the Invoice No. and Transaction ID.", 515, 9)
    .forEach((l, i) => text(l, 40, y - i * 12, { size: 9, color: grey }));
  text("Team Gradia - Learn. Practice. Compete. Get Hired.", 40, 40, { size: 9, color: grey });
  return await pdf.save();
}

export function toBase64(bytes: Uint8Array) {
  let s = ""; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}
