// Generates a branded GST-style PDF invoice for a successful Razorpay payment
// and emails it to the user as an attachment via Resend.
// Invoked server-side from verify-* edge functions. verify_jwt = false.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptPayload {
  user_id?: string;
  email?: string;
  name?: string;
  payment_id: string;
  order_id?: string;
  amount: number; // in INR rupees
  item_name: string;
  item_description?: string;
  item_type?: "subscription" | "wallet" | "unlock" | "plan" | "resume" | "other";
  user_role?: "candidate" | "employer" | string;
  paid_at?: string; // ISO
}

const COMPANY = {
  name: "Gradia Hiring Pvt Ltd",
  address1: "Bangalore, Karnataka, India",
  address2: "Hyderabad, Telangana, India",
  email: "info@gradiaa.com",
  website: "www.gradiaa.com",
  gstin: "—",
  brandHex: "#5b21b6",
};

function inr(n: number): string {
  return `INR ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildInvoiceNumber(paymentId: string, dt: Date): string {
  const yyyymm = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const tail = paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return `GRD-${yyyymm}-${tail}`;
}

function generatePdf(data: ReceiptPayload, invoiceNo: string, paidAt: Date): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const left = 40;
  const right = W - 40;

  // Brand bar
  doc.setFillColor(91, 33, 182);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("GRADIA", left, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Hiring. Simplified.", left, 50);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", right, 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Original for Recipient", right, 50, { align: "right" });

  // Reset text color
  doc.setTextColor(30, 30, 30);

  // Company block
  let y = 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(COMPANY.name, left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 14; doc.text(COMPANY.address1, left, y);
  y += 12; doc.text(COMPANY.address2, left, y);
  y += 12; doc.text(`Email: ${COMPANY.email}  |  ${COMPANY.website}`, left, y);
  y += 12; doc.text(`GSTIN: ${COMPANY.gstin}`, left, y);

  // Invoice meta (right column)
  let yr = 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Invoice No:", right - 150, yr); doc.setFont("helvetica", "normal"); doc.text(invoiceNo, right, yr, { align: "right" });
  yr += 14; doc.setFont("helvetica", "bold"); doc.text("Invoice Date:", right - 150, yr); doc.setFont("helvetica", "normal"); doc.text(paidAt.toLocaleDateString("en-IN"), right, yr, { align: "right" });
  yr += 14; doc.setFont("helvetica", "bold"); doc.text("Payment ID:", right - 150, yr); doc.setFont("helvetica", "normal"); doc.text(data.payment_id, right, yr, { align: "right" });
  if (data.order_id) {
    yr += 14; doc.setFont("helvetica", "bold"); doc.text("Order ID:", right - 150, yr); doc.setFont("helvetica", "normal"); doc.text(data.order_id, right, yr, { align: "right" });
  }
  yr += 14; doc.setFont("helvetica", "bold"); doc.text("Payment Mode:", right - 150, yr); doc.setFont("helvetica", "normal"); doc.text("Razorpay", right, yr, { align: "right" });

  // Bill-to box
  y = Math.max(y, yr) + 30;
  doc.setDrawColor(220, 220, 230);
  doc.setFillColor(248, 247, 252);
  doc.rect(left, y, right - left, 60, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Billed To", left + 10, y + 18);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(data.name || "Customer", left + 10, y + 34);
  if (data.email) doc.text(data.email, left + 10, y + 48);
  if (data.user_role) {
    doc.setFont("helvetica", "bold"); doc.text("Account Type:", right - 150, y + 18);
    doc.setFont("helvetica", "normal");
    doc.text(data.user_role.charAt(0).toUpperCase() + data.user_role.slice(1), right - 10, y + 18, { align: "right" });
  }

  // Items header
  y += 90;
  doc.setFillColor(91, 33, 182);
  doc.rect(left, y, right - left, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Description", left + 12, y + 17);
  doc.text("Qty", right - 200, y + 17, { align: "right" });
  doc.text("Rate", right - 110, y + 17, { align: "right" });
  doc.text("Amount", right - 12, y + 17, { align: "right" });

  // Item row
  y += 26;
  doc.setTextColor(30, 30, 30);
  doc.setFillColor(255, 255, 255);
  doc.rect(left, y, right - left, 50, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(data.item_name, left + 12, y + 20);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110, 110, 120);
  if (data.item_description) doc.text(data.item_description.slice(0, 90), left + 12, y + 36);
  doc.setFontSize(10); doc.setTextColor(30, 30, 30);
  doc.text("1", right - 200, y + 20, { align: "right" });
  doc.text(inr(data.amount), right - 110, y + 20, { align: "right" });
  doc.text(inr(data.amount), right - 12, y + 20, { align: "right" });

  // Totals
  y += 70;
  const totalsX = right - 220;
  const drawRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 10);
    doc.text(label, totalsX, y);
    doc.text(value, right - 12, y, { align: "right" });
    y += 18;
  };
  drawRow("Subtotal", inr(data.amount));
  drawRow("CGST (0%)", inr(0));
  drawRow("SGST (0%)", inr(0));
  doc.setDrawColor(91, 33, 182);
  doc.line(totalsX, y - 4, right - 12, y - 4);
  y += 4;
  drawRow("Total Paid", inr(data.amount), true);

  // Status badge
  y += 10;
  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(left, y, 110, 26, 4, 4, "FD");
  doc.setTextColor(21, 128, 61);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("PAID", left + 55, y + 17, { align: "center" });
  doc.setTextColor(30, 30, 30);

  // Footer note
  y += 60;
  doc.setDrawColor(230, 230, 235);
  doc.line(left, y, right, y);
  y += 18;
  doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(110, 110, 120);
  doc.text("This is a computer-generated invoice and does not require a physical signature.", left, y);
  y += 14;
  doc.text(`For any billing queries, contact ${COMPANY.email}.`, left, y);
  y += 14;
  doc.text("Thank you for choosing Gradia.", left, y);

  // Page footer
  doc.setFontSize(8); doc.setTextColor(150, 150, 160);
  doc.text(`${COMPANY.name}  •  ${COMPANY.website}`, W / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}

function emailHtml(data: ReceiptPayload, invoiceNo: string, paidAt: Date) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f5f4fa;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:linear-gradient(135deg,#5b21b6 0%,#7c3aed 100%);padding:28px 32px;color:#fff;">
      <div style="font-size:22px;font-weight:700;letter-spacing:1px;">GRADIA</div>
      <div style="font-size:13px;opacity:.9;margin-top:4px;">Payment Receipt</div>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;margin:0 0 8px;">Hi ${data.name || "there"},</p>
      <p style="margin:0 0 20px;color:#4b5563;">Thank you for your payment. Your transaction was successful and your invoice is attached to this email as a PDF.</p>
      <div style="background:#f8f7fc;border:1px solid #ece9f5;border-radius:10px;padding:18px 20px;margin:20px 0;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;">Invoice No</td><td style="padding:6px 0;text-align:right;font-weight:600;">${invoiceNo}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;text-align:right;">${paidAt.toLocaleDateString("en-IN")}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Item</td><td style="padding:6px 0;text-align:right;">${data.item_name}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Payment ID</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px;">${data.payment_id}</td></tr>
          <tr><td style="padding:10px 0 0;color:#111827;font-weight:700;border-top:1px solid #ece9f5;">Total Paid</td><td style="padding:10px 0 0;text-align:right;font-weight:700;color:#5b21b6;border-top:1px solid #ece9f5;">${inr(data.amount)}</td></tr>
        </table>
      </div>
      <p style="margin:20px 0 0;color:#4b5563;font-size:13px;">Need help? Reply to this email or contact <a href="mailto:${COMPANY.email}" style="color:#5b21b6;">${COMPANY.email}</a>.</p>
    </div>
    <div style="background:#0f0a1f;color:#a5a3b8;padding:18px 32px;font-size:12px;text-align:center;">
      © ${paidAt.getFullYear()} ${COMPANY.name} • ${COMPANY.website}
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const data = (await req.json()) as ReceiptPayload;

    if (!data?.payment_id || !data?.amount || !data?.item_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve recipient email/name from profile if not provided
    let email = data.email;
    let name = data.name;
    let role = data.user_role;
    if ((!email || !name) && data.user_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, role")
        .eq("id", data.user_id)
        .maybeSingle();
      if (profile) {
        email = email || profile.email;
        name = name || profile.full_name;
        role = role || profile.role;
      }
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "No recipient email available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
    const invoiceNo = buildInvoiceNumber(data.payment_id, paidAt);

    const pdfBytes = generatePdf({ ...data, name, email, user_role: role }, invoiceNo, paidAt);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[send-payment-receipt] RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const resend = new Resend(RESEND_API_KEY);

    // Resend expects base64-encoded content for attachments
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < pdfBytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(pdfBytes.subarray(i, i + chunk)) as any);
    }
    const pdfBase64 = btoa(binary);

    const sendResp = await resend.emails.send({
      from: "Gradia Billing <noreply@gradia.co.in>",
      to: [email],
      subject: `Your Gradia Invoice ${invoiceNo} – ${inr(data.amount)}`,
      html: emailHtml({ ...data, name, email }, invoiceNo, paidAt),
      attachments: [
        {
          filename: `${invoiceNo}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if ((sendResp as any)?.error) {
      console.error("[send-payment-receipt] Resend error", (sendResp as any).error);
      return new Response(JSON.stringify({ error: "Failed to send email", details: (sendResp as any).error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, invoice_no: invoiceNo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[send-payment-receipt] exception", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
