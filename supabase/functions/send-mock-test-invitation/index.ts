import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MockTestInvitationRequest {
  candidateEmail: string;
  candidateName: string;
  sessionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateEmail, candidateName, sessionId }: MockTestInvitationRequest = await req.json();

    console.log('Sending mock test invitation to:', candidateEmail);

    const testLink = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/candidate/mock-test/${sessionId}`;

    const emailResponse = await resend.emails.send({
      from: "Gradia <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: "Your Mock Interview Test is Ready! 🎯",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; background: #0d9488; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Mock Interview Test</h1>
            </div>
            <div class="content">
              <h2>Hello ${candidateName}!</h2>
              <p>Your mock interview test is ready. This is a great opportunity to practice and prepare for real interviews.</p>
              
              <div class="info-box">
                <h3>📋 Test Details:</h3>
                <ul>
                  <li><strong>Format:</strong> 10 Multiple Choice Questions</li>
                  <li><strong>Time:</strong> 60 seconds per question</li>
                  <li><strong>Topics:</strong> Based on your profile and teaching expertise</li>
                  <li><strong>Recording:</strong> Screen will be recorded for review</li>
                </ul>
              </div>
              
              <p><strong>Tips for success:</strong></p>
              <ul>
                <li>Find a quiet place with good internet connection</li>
                <li>Allow screen recording when prompted</li>
                <li>Read each question carefully before answering</li>
                <li>Stay calm and confident!</li>
              </ul>
              
              <center>
                <p>Click the button below to start your test:</p>
                <a href="${testLink}" class="button">Start Mock Test →</a>
              </center>
              
              <p><em>Note: This test is for practice purposes and will help you prepare for actual interviews.</em></p>
            </div>
            <div class="footer">
              <p>Best of luck! 🍀</p>
              <p>The Gradia Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Mock test invitation sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending mock test invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
