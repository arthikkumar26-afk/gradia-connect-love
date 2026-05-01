import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Recipient {
  email: string;
  name?: string;
  jobTitle?: string;
  score?: number;
  fileName?: string;
}

interface Body {
  recipients: Recipient[];
  subject: string;
  htmlBody: string;
  fromName?: string;
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyTokens(template: string, r: Recipient, employer: string) {
  const map: Record<string, string> = {
    "{{name}}": escapeHtml(r.name || "Candidate"),
    "{{job}}": escapeHtml(r.jobTitle || ""),
    "{{score}}": r.score != null ? String(r.score) : "",
    "{{company}}": escapeHtml(employer || ""),
    "{{file}}": escapeHtml(r.fileName || ""),
  };
  let out = template;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  return out;
}

function wrapHtml(inner: string, subject: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr><td style="padding:24px;font-size:14px;line-height:1.6;">
${inner}
</td></tr>
<tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Sent via Gradia HR Portal</p>
</td></tr>
</table></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
    const resend = new Resend(RESEND_API_KEY);

    const { recipients, subject, htmlBody, fromName }: Body = await req.json();

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || !htmlBody) {
      return new Response(JSON.stringify({ error: "Subject and body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const employer = (fromName || "Gradia").slice(0, 100);
    const from = `${employer} <onboarding@resend.dev>`;
    const results: { email: string; status: "sent" | "failed"; error?: string }[] = [];

    for (const r of recipients) {
      const email = String(r.email || "").trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) {
        results.push({ email, status: "failed", error: "invalid email" });
        continue;
      }
      try {
        const personalizedSubject = applyTokens(subject, r, employer);
        const personalizedBody = applyTokens(htmlBody, r, employer);
        const html = wrapHtml(personalizedBody.replace(/\n/g, "<br/>"), personalizedSubject);
        const { error } = await resend.emails.send({
          from,
          to: [email],
          subject: personalizedSubject,
          html,
        });
        if (error) {
          results.push({ email, status: "failed", error: String((error as { message?: string })?.message || error) });
        } else {
          results.push({ email, status: "sent" });
        }
      } catch (e) {
        results.push({ email, status: "failed", error: e instanceof Error ? e.message : "send failed" });
      }
    }

    const sent = results.filter(r => r.status === "sent").length;
    return new Response(JSON.stringify({ sent, total: recipients.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
