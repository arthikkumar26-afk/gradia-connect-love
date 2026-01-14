import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResumeAnalysis {
  overall_score: number;
  strengths: string[];
  improvements: string[];
  experience_summary: string;
  skill_highlights: string[];
  career_level: string;
}

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
  resumeAnalysis?: ResumeAnalysis;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const registrationData: RegistrationData = await req.json();
    console.log("Received registration data:", registrationData);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Use resume analysis if provided, otherwise use defaults
    const analysis = registrationData.resumeAnalysis ? {
      score: registrationData.resumeAnalysis.overall_score || 70,
      strengths: registrationData.resumeAnalysis.strengths || ["Profile registered successfully"],
      improvements: registrationData.resumeAnalysis.improvements || ["Complete your profile for better matches"],
      summary: registrationData.resumeAnalysis.experience_summary || "Your profile has been registered successfully.",
      skill_highlights: registrationData.resumeAnalysis.skill_highlights || [],
      career_level: registrationData.resumeAnalysis.career_level || "Professional"
    } : {
      score: 70,
      strengths: ["Education background", "Relevant experience", "Subject expertise"],
      improvements: ["Upload your resume for detailed analysis", "Complete all profile sections"],
      summary: "Complete your profile and upload a resume for AI-powered analysis.",
      skill_highlights: [],
      career_level: "Professional"
    };

    const hasResumeAnalysis = !!registrationData.resumeAnalysis;

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

          <!-- Resume Analysis Badge -->
          ${hasResumeAnalysis ? `
          <tr>
            <td style="padding: 15px 30px 0 30px; text-align: center;">
              <span style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                🤖 AI Resume Analysis Included
              </span>
            </td>
          </tr>
          ` : ''}

          <!-- Score Section -->
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h2 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 20px;">${hasResumeAnalysis ? 'Your Resume Score' : 'Your Profile Score'}</h2>
              <div style="display: inline-block; width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, ${analysis.score >= 80 ? '#10b981' : analysis.score >= 60 ? '#f59e0b' : '#ef4444'} 0%, ${analysis.score >= 80 ? '#059669' : analysis.score >= 60 ? '#d97706' : '#dc2626'} 100%); line-height: 120px; text-align: center;">
                <span style="font-size: 36px; font-weight: bold; color: #ffffff;">${analysis.score}</span>
              </div>
              <p style="color: #374151; margin: 15px 0 5px 0; font-size: 14px; font-weight: 500;">
                ${analysis.score >= 80 ? '🌟 Excellent Profile!' : analysis.score >= 60 ? '👍 Good Profile' : '📈 Room for Improvement'}
              </p>
              ${analysis.career_level ? `<p style="color: #6b7280; margin: 0 0 10px 0; font-size: 13px;">Career Level: ${analysis.career_level}</p>` : ''}
              <p style="color: #6b7280; margin: 0; font-size: 14px; font-style: italic;">${analysis.summary}</p>
            </td>
          </tr>

          <!-- Skill Highlights (if from resume) -->
          ${hasResumeAnalysis && analysis.skill_highlights && analysis.skill_highlights.length > 0 ? `
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="color: #6366f1; margin: 0 0 15px 0; font-size: 16px;">🎯 Key Skills Detected</h3>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${analysis.skill_highlights.slice(0, 8).map((skill: string) => `
                  <span style="display: inline-block; background-color: #eef2ff; color: #4f46e5; padding: 6px 12px; border-radius: 20px; font-size: 13px; margin: 2px;">${skill}</span>
                `).join('')}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Strengths -->
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 16px;">✅ Your Strengths</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${analysis.strengths.map((s: string) => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
              </ul>
            </td>
          </tr>

          <!-- Improvements -->
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 16px;">💡 Areas to Improve</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${analysis.improvements.map((i: string) => `<li style="margin-bottom: 8px;">${i}</li>`).join('')}
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
    
    let emailSent = false;
    let emailError = null;
    
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Gradia <noreply@gradia.co.in>",
          to: [registrationData.email],
          subject: `🎉 Welcome to Gradia! Your Profile Score: ${analysis.score}/100`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        console.error("Email send error:", errorData);
        
        // Check if it's a domain verification issue
        if (errorData.includes("verify a domain") || errorData.includes("testing emails")) {
          emailError = "Email service requires domain verification. Registration saved successfully - email will be sent once domain is verified.";
        } else {
          emailError = "Email delivery issue - registration still successful";
        }
      } else {
        const emailResult = await emailResponse.json();
        console.log("Email sent successfully:", emailResult);
        emailSent = true;
      }
    } catch (e) {
      console.error("Email fetch error:", e);
      emailError = "Email service temporarily unavailable";
    }

    // Return success even if email fails (registration data is valid)
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent,
        message: emailSent 
          ? "Registration email sent successfully" 
          : emailError || "Registration saved - email pending",
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
