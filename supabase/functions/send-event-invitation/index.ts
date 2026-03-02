import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #1a73e8; margin: 0;">Gradia</h1>
          <p style="color: #666; margin: 4px 0;">YOUR NEXT STEP</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #e8f0fe, #f0f4f8); border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #333; font-size: 24px;">🎉 You're Invited!</h2>
          <h3 style="color: #1a73e8;">Gradia Launch Event</h3>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We Are "Gradia" Introducing New Eco-System Into New Human Resource Management System.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 4px 0; font-weight: bold; color: #333;">📅 Tuesday, 03-03-2026</p>
            <p style="margin: 4px 0; color: #555;">🕗 08:00 PM - 9:00 PM</p>
            <p style="margin: 4px 0; color: #555;">📍 Online (Zoom)</p>
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
            <p style="font-weight: bold; color: #333; margin-bottom: 10px;">Join Zoom Meeting:</p>
            <p style="margin: 4px 0;">
              <a href="https://us05web.zoom.us/j/84869881986?pwd=2hG3ZRZjczuz2b42RBweGndfUBYOfB.1" 
                 style="color: #1a73e8; word-break: break-all;">
                https://us05web.zoom.us/j/84869881986?pwd=2hG3ZRZjczuz2b42RBweGndfUBYOfB.1
              </a>
            </p>
            <p style="margin: 8px 0 4px; color: #555;"><strong>Meeting ID:</strong> 848 6988 1986</p>
            <p style="margin: 4px 0; color: #555;"><strong>Passcode:</strong> Gradia</p>
          </div>
          
          <a href="https://us05web.zoom.us/j/84869881986?pwd=2hG3ZRZjczuz2b42RBweGndfUBYOfB.1" 
             style="display: inline-block; background: #1a73e8; color: white; padding: 14px 32px; 
                    border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 10px;">
            Join Meeting
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>We Are live Now: <a href="https://www.gradia.co.in" style="color: #1a73e8;">www.gradia.co.in</a></p>
          <p>© 2026 Gradia. All rights reserved.</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gradia <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 You're Invited! Gradia Launch Event - Tuesday 03-03-2026",
        html: htmlContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
