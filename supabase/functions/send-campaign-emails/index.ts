import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, subject, htmlBody, senderName, attachments } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Recipients list is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subject || !htmlBody) {
      return new Response(JSON.stringify({ error: "Subject and message body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Resend attachments using path (URL) - no need to download the file
    const resendAttachments: { filename: string; path: string }[] = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.url) {
          resendAttachments.push({ filename: att.name, path: att.url });
          console.log(`Attachment added: ${att.name} via URL`);
        }
      }
    }

    const fromAddress = `${senderName || "Gradia EduTech"} <noreply@gradia.co.in>`;
    const results: { email: string; status: string; error?: string }[] = [];

    for (const email of recipients) {
      try {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) continue;

        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f9fc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">${senderName || "Gradia EduTech"}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              ${htmlBody}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">This email was sent by ${senderName || "Gradia EduTech"} via Gradia Platform.</p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">© ${new Date().getFullYear()} Gradia. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        if (results.length > 0) {
          await new Promise(r => setTimeout(r, 200));
        }

        const emailPayload: any = {
          from: fromAddress,
          to: [trimmedEmail],
          subject: subject,
          html: fullHtml,
          headers: {
            "X-Entity-Ref-ID": crypto.randomUUID(),
            "List-Unsubscribe": `<mailto:unsubscribe@gradia.co.in?subject=Unsubscribe>`,
          },
        };

        if (resendAttachments.length > 0) {
          emailPayload.attachments = resendAttachments;
        }

        const response = await resend.emails.send(emailPayload);
        console.log(`Email sent to ${trimmedEmail}:`, response);
        results.push({ email: trimmedEmail, status: "sent" });
      } catch (emailError: any) {
        console.error(`Failed to send to ${email}:`, emailError);
        results.push({ email: email.trim(), status: "failed", error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.status === "sent").length;
    const failedCount = results.filter(r => r.status === "failed").length;

    return new Response(
      JSON.stringify({ success: true, totalSent: successCount, totalFailed: failedCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Campaign email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
