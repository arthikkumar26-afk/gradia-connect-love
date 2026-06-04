import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeErrorMessage } from "../_shared/safeError.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildInlineMediaHtml(attachments: { name: string; url: string; type: string; size: number }[]): string {
  if (!attachments || attachments.length === 0) return "";

  let html = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:20px;">`;

  for (const att of attachments) {
    if (att.type.startsWith("image/")) {
      // Images displayed inline
      html += `
        <tr>
          <td style="padding:8px 0;">
            <img src="${att.url}" alt="${att.name}" style="max-width:100%;height:auto;border-radius:8px;display:block;" />
            <p style="margin:4px 0 12px;color:#6b7280;font-size:12px;">${att.name}</p>
          </td>
        </tr>`;
    } else if (att.type.startsWith("video/")) {
      // Videos as thumbnail with play icon + download link
      html += `
        <tr>
          <td style="padding:8px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="background:#f3f4f6;border-radius:8px;width:100%;">
              <tr>
                <td style="padding:16px;text-align:center;">
                  <div style="font-size:40px;margin-bottom:8px;">🎬</div>
                  <a href="${att.url}" target="_blank" style="color:#0f766e;font-weight:600;font-size:14px;text-decoration:none;">${att.name}</a>
                  <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">Video attachment • Click to download/view</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    } else if (att.type.includes("pdf")) {
      // PDFs as styled download card
      html += `
        <tr>
          <td style="padding:8px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="background:#fef3c7;border-radius:8px;width:100%;">
              <tr>
                <td style="padding:14px 16px;">
                  <a href="${att.url}" target="_blank" style="color:#92400e;font-weight:600;font-size:14px;text-decoration:none;">📄 ${att.name}</a>
                  <p style="margin:4px 0 0;color:#b45309;font-size:12px;">PDF Document • Click to download</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    } else {
      // Other files as generic download link
      html += `
        <tr>
          <td style="padding:8px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="background:#f3f4f6;border-radius:8px;width:100%;">
              <tr>
                <td style="padding:14px 16px;">
                  <a href="${att.url}" target="_blank" style="color:#374151;font-weight:600;font-size:14px;text-decoration:none;">📎 ${att.name}</a>
                  <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Attachment • Click to download</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }
  }

  html += `</table>`;
  return html;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, subject, htmlBody, senderName, attachments, campaignName } = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id ?? null;
    }

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

    // Build Resend attachments using path (URL) for downloadable files
    const resendAttachments: { filename: string; path: string }[] = [];
    const inlineAttachments: { name: string; url: string; type: string; size: number }[] = [];

    if (attachments && Array.isArray(attachments)) {
      // Resend has a ~40MB total payload limit; attach small files, link large ones
      const ATTACH_LIMIT = 10 * 1024 * 1024; // 10MB per file
      for (const att of attachments) {
        if (att.url) {
          if (typeof att.size === "number" && att.size <= ATTACH_LIMIT) {
            resendAttachments.push({ filename: att.name, path: att.url });
          }
          inlineAttachments.push({ name: att.name, url: att.url, type: att.type, size: att.size });
          console.log(`Attachment processed: ${att.name} (${att.type}, ${att.size} bytes)`);
        }
      }
    }

    // Build inline media HTML for the email body
    const inlineMediaHtml = buildInlineMediaHtml(inlineAttachments);

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
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#222222;font-size:14px;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ffffff;">
    <tr>
      <td style="padding:20px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;">
          <tr>
            <td style="padding:0 0 16px;">
              ${htmlBody}
              ${inlineMediaHtml}
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

    // Save campaign history to database
    if (userId) {
      try {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const rows = results.map(r => ({
          campaign_name: campaignName || senderName || "Untitled Campaign",
          sender_name: senderName || "Gradia EduTech",
          subject,
          recipient_email: r.email,
          status: r.status === "sent" ? "delivered" : "failed",
          user_id: userId,
          attachments: attachments ? JSON.stringify(attachments) : "[]",
        }));
        const { error: insertError } = await serviceClient.from("campaign_emails").insert(rows);
        if (insertError) console.error("Failed to save campaign history:", insertError);
      } catch (dbErr) {
        console.error("DB save error:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalSent: successCount, totalFailed: failedCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Campaign email error:", error);
    return new Response(
      JSON.stringify({ error: safeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
