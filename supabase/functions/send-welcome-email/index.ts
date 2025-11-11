import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  role: "candidate" | "employer";
}

const getCandidateEmailTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .features { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature-item { margin: 15px 0; padding-left: 25px; position: relative; }
    .feature-item:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 32px;">Welcome to Gradia! 🎉</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px;">Hi ${name},</p>
      
      <p>Congratulations on taking the first step toward your next career opportunity! We're thrilled to have you join the Gradia community.</p>
      
      <p><strong>Your journey starts here:</strong></p>
      
      <div class="features">
        <div class="feature-item">Browse thousands of verified job openings from top companies</div>
        <div class="feature-item">Get matched with roles that fit your skills and experience</div>
        <div class="feature-item">Access AI-powered resume builder and interview prep tools</div>
        <div class="feature-item">Track all your applications in one dashboard</div>
        <div class="feature-item">Receive career coaching and salary insights</div>
      </div>
      
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Complete your profile to increase visibility</li>
        <li>Upload your resume (our AI will help extract key details)</li>
        <li>Browse jobs and start applying</li>
        <li>Set up job alerts for your dream role</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://gradia.lovable.app'}/candidate/dashboard" class="button">Go to Dashboard</a>
      </div>
      
      <p style="margin-top: 30px;">Need help getting started? Check out our <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://gradia.lovable.app'}/candidate/interview-prep" style="color: #667eea;">resources</a> or reach out to our support team.</p>
      
      <p style="margin-top: 20px;">Best of luck in your job search!</p>
      <p><strong>The Gradia Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Gradia - Your Next Step</p>
      <p>You're receiving this email because you created an account on Gradia.</p>
    </div>
  </div>
</body>
</html>
`;

const getEmployerEmailTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .features { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature-item { margin: 15px 0; padding-left: 25px; position: relative; }
    .feature-item:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 32px;">Welcome to Gradia! 🚀</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px;">Hi ${name},</p>
      
      <p>Thank you for joining Gradia! We're excited to help you build your dream team with top talent.</p>
      
      <p><strong>What you can do with Gradia:</strong></p>
      
      <div class="features">
        <div class="feature-item">Post unlimited job openings and reach qualified candidates</div>
        <div class="feature-item">AI-powered candidate matching for faster hiring</div>
        <div class="feature-item">Manage applications with our intuitive ATS dashboard</div>
        <div class="feature-item">Access talent pool of pre-vetted professionals</div>
        <div class="feature-item">Track hiring metrics and team performance</div>
        <div class="feature-item">Background verification and screening tools</div>
      </div>
      
      <p><strong>Get Started in 3 Easy Steps:</strong></p>
      <ol>
        <li>Complete your company profile</li>
        <li>Post your first job opening</li>
        <li>Review applications and start hiring</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://gradia.lovable.app'}/employer/dashboard" class="button">Go to Dashboard</a>
      </div>
      
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
        <p style="margin: 0; font-weight: 600;">💡 Pro Tip</p>
        <p style="margin: 10px 0 0 0;">Companies with complete profiles receive 3x more quality applications. Take a few minutes to showcase your company culture and values!</p>
      </div>
      
      <p>Need assistance? Our team is here to help you every step of the way. Check out our <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://gradia.lovable.app'}/employer/pricing" style="color: #667eea;">pricing plans</a> or <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://gradia.lovable.app'}/employer/demo" style="color: #667eea;">request a demo</a>.</p>
      
      <p style="margin-top: 20px;">Happy hiring!</p>
      <p><strong>The Gradia Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Gradia - Your Next Step</p>
      <p>You're receiving this email because you created an employer account on Gradia.</p>
    </div>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, role }: WelcomeEmailRequest = await req.json();

    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, fullName, or role" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (role !== "candidate" && role !== "employer") {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be 'candidate' or 'employer'" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailTemplate = role === "candidate" 
      ? getCandidateEmailTemplate(fullName)
      : getEmployerEmailTemplate(fullName);

    const subject = role === "candidate"
      ? "Welcome to Gradia - Start Your Career Journey! 🎯"
      : "Welcome to Gradia - Let's Build Your Dream Team! 🚀";

    const emailResponse = await resend.emails.send({
      from: "Gradia <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: emailTemplate,
    });

    console.log(`Welcome email sent successfully to ${email} (${role}):`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Welcome email sent successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send welcome email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
