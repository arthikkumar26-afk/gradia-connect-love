import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationEmailRequest {
  email: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  aiScore?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, candidateName, jobTitle, companyName, aiScore }: ApplicationEmailRequest = await req.json();

    console.log("Sending application confirmation email to:", email);

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { margin: 0 0 10px; font-size: 28px; }
          .content { background: #ffffff; padding: 30px; }
          .info-card { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
          ${aiScore ? `
          .score-card { background: linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 1px solid #e0e7ff; }
          .score { font-size: 48px; font-weight: bold; color: #6366f1; }
          .score-label { color: #666; font-size: 14px; margin-top: 5px; }
          ` : ''}
          .next-steps { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .next-steps h3 { color: #16a34a; margin-top: 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; background: #f9fafb; border-radius: 0 0 12px 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Application Received!</h1>
            <p style="margin: 0; opacity: 0.9;">Thank you for applying</p>
          </div>
          <div class="content">
            <p>Dear ${candidateName},</p>
            <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. We have received your application!</p>
            
            ${aiScore ? `
            <div class="score-card">
              <div class="score">${aiScore}%</div>
              <div class="score-label">AI Match Score</div>
            </div>
            ` : ''}
            
            <div class="info-card">
              <h3 style="margin-top: 0; color: #6366f1;">📋 Application Details</h3>
              <p><strong>Position:</strong> ${jobTitle}</p>
              <p><strong>Company:</strong> ${companyName}</p>
              <p style="margin-bottom: 0;"><strong>Status:</strong> Under Review ✓</p>
            </div>
            
            <div class="next-steps">
              <h3>🚀 What Happens Next?</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Our AI system has analyzed your profile</li>
                <li>Your skills have been matched with job requirements</li>
                <li>Our hiring team will review your application</li>
                <li>If shortlisted, we'll contact you for an interview</li>
              </ol>
            </div>
            
            <p style="color: #666;">Keep an eye on your inbox for updates. We aim to review applications within 2-3 business days.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br><strong>The ${companyName} Hiring Team</strong></p>
            <p style="font-size: 12px; color: #999;">Powered by Gradia Job Portal</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} Hiring <hr@gradia.co.in>`,
        to: [email],
        subject: `✅ Application Received: ${jobTitle} at ${companyName}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();
    console.log("Email send result:", result);

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ error: result.error.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: result.id,
        message: `Confirmation email sent to ${email}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending application email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
