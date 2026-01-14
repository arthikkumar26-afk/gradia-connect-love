import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationData {
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  category: string;
  segment: string;
  department: string;
  designation: string;
  location: string;
  currentSalary: string;
  expectedSalary: string;
  highestQualification: string;
  specialization: string;
  totalExperience: string;
  currentOrganization: string;
  skills: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const registrationData: RegistrationData = await req.json();
    console.log("Received registration data:", registrationData);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Use AI to analyze the profile and generate a score
    const aiPrompt = `Analyze this education professional's profile and provide a score out of 100, along with brief feedback.

Profile Details:
- Name: ${registrationData.fullName}
- Category: ${registrationData.category}
- Segment: ${registrationData.segment}
- Department: ${registrationData.department}
- Designation: ${registrationData.designation}
- Location: ${registrationData.location}
- Highest Qualification: ${registrationData.highestQualification || "Not provided"}
- Specialization: ${registrationData.specialization || "Not provided"}
- Total Experience: ${registrationData.totalExperience || "Not provided"}
- Current Organization: ${registrationData.currentOrganization || "Not provided"}
- Key Skills: ${registrationData.skills || "Not provided"}
- Current Salary: ${registrationData.currentSalary || "Not provided"}
- Expected Salary: ${registrationData.expectedSalary || "Not provided"}

Provide your analysis in this exact JSON format:
{
  "score": <number between 0-100>,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2"],
  "summary": "brief 2-3 sentence summary"
}`;

    console.log("Calling AI for profile analysis...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert HR analyst specializing in education sector recruitment. Analyze profiles objectively and provide constructive feedback. Always respond with valid JSON only." },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || "";
    console.log("AI Response:", aiContent);

    // Parse AI response
    let analysis = {
      score: 75,
      strengths: ["Education background", "Relevant experience", "Subject expertise"],
      improvements: ["Add more skills", "Complete all profile sections"],
      summary: "Your profile shows good potential for education sector opportunities."
    };

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response, using defaults:", parseError);
    }

    // Generate email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmation - Gradia</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Welcome to Gradia!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your registration is complete</p>
            </td>
          </tr>

          <!-- Score Section -->
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h2 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 20px;">Your Profile Score</h2>
              <div style="display: inline-block; width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, ${analysis.score >= 80 ? '#10b981' : analysis.score >= 60 ? '#f59e0b' : '#ef4444'} 0%, ${analysis.score >= 80 ? '#059669' : analysis.score >= 60 ? '#d97706' : '#dc2626'} 100%); line-height: 120px; text-align: center;">
                <span style="font-size: 36px; font-weight: bold; color: #ffffff;">${analysis.score}</span>
              </div>
              <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 14px;">${analysis.summary}</p>
            </td>
          </tr>

          <!-- Strengths -->
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 16px;">✅ Your Strengths</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${analysis.strengths.map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
              </ul>
            </td>
          </tr>

          <!-- Improvements -->
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 16px;">💡 Areas to Improve</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${analysis.improvements.map(i => `<li style="margin-bottom: 8px;">${i}</li>`).join('')}
              </ul>
            </td>
          </tr>

          <!-- Your Details -->
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb;">
              <h3 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 16px;">📋 Your Registration Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 40%;">Full Name:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${registrationData.fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Mobile:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.mobile}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Date of Birth:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.dateOfBirth || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Category:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.category}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Segment:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.segment}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Department:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.department}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Designation:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.designation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Location:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.location}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Qualification:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.highestQualification || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Experience:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.totalExperience || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Skills:</td>
                  <td style="padding: 8px 0; color: #111827;">${registrationData.skills || 'Not provided'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <a href="https://gradia-link-shine.lovable.app/candidate/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      🚀 Go to Dashboard
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="https://gradia-link-shine.lovable.app/edit-profile" 
                       style="display: inline-block; background-color: #ffffff; color: #1e3a5f; text-decoration: none; padding: 12px 35px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #1e3a5f;">
                      ✏️ Edit Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 20px 30px; text-align: center;">
              <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 14px;">
                Thank you for joining Gradia - Your gateway to education careers!
              </p>
              <p style="color: rgba(255,255,255,0.6); margin: 10px 0 0 0; font-size: 12px;">
                © 2024 Gradia. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email using Resend
    console.log("Sending email to:", registrationData.email);
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gradia <onboarding@resend.dev>",
        to: [registrationData.email],
        subject: `🎉 Welcome to Gradia! Your Profile Score: ${analysis.score}/100`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error("Email send error:", emailError);
      throw new Error("Failed to send email");
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Registration email sent successfully",
        score: analysis.score,
        analysis 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in send-registration-email:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
