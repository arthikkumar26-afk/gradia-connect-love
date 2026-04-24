import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { safeErrorMessage } from "../_shared/safeError.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CredentialsEmailRequest {
  email: string;
  fullName: string;
  password: string;
  role: "candidate" | "employer" | string;
}

const roleLoginPath: Record<string, string> = {
  candidate: "/login",
  employer: "/employer/login",
  freelancer: "/freelancer/login",
  edutech: "/edutech/login",
  sponsor: "/sponsor/login",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, password, role }: CredentialsEmailRequest = await req.json();

    if (!email || !email.includes("@") || !password || !role) {
      return new Response(
        JSON.stringify({ error: "email, password and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const loginPath = roleLoginPath[role] || "/login";
    const loginUrl = `https://gradia.world${loginPath}`;
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background:#f3f4f6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0f4c75 0%, #1e3a5f 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #ffffff; padding: 28px 24px; }
          .creds { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:18px 20px; margin:18px 0; }
          .creds p { margin: 6px 0; font-size: 14px; }
          .creds code { background:#0f172a; color:#fff; padding:4px 10px; border-radius:6px; font-size: 14px; letter-spacing: 0.5px; }
          .btn { display:inline-block; background:#ea580c; color:#fff !important; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top: 12px; }
          .warn { background:#fff7ed; border-left:4px solid #ea580c; padding:12px 14px; border-radius:4px; font-size:13px; color:#7c2d12; margin-top:18px; }
          .footer { text-align:center; padding:18px; color:#6b7280; font-size:12px; background:#f9fafb; border-radius: 0 0 12px 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Gradia</h1>
            <p style="margin:6px 0 0; opacity:0.9;">Your ${roleLabel} account is ready</p>
          </div>
          <div class="content">
            <p>Dear ${fullName || "User"},</p>
            <p>An administrator has created a Gradia <strong>${roleLabel}</strong> account for you. Use the credentials below to sign in:</p>
            <div class="creds">
              <p><strong>Email:</strong> <code>${email}</code></p>
              <p><strong>Temporary Password:</strong> <code>${password}</code></p>
              <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            </div>
            <a href="${loginUrl}" class="btn">Sign in to your account</a>
            <div class="warn">
              🔒 For your security, please change your password immediately after your first login.
            </div>
            <p style="margin-top:20px; color:#6b7280; font-size:13px;">If you did not request this account, please contact <a href="mailto:info@gradiaa.com">info@gradiaa.com</a>.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Gradia. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gradia Hiring <noreply@gradia.co.in>",
        to: [email],
        subject: `Your Gradia ${roleLabel} account credentials`,
        html,
      }),
    });

    const result = await response.json();
    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-account-credentials error:", error);
    return new Response(
      JSON.stringify({ error: safeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
