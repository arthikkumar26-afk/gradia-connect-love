import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      resumeUrl,
      jobId,
      employerId,
      coverLetter,
      aiScore,
      aiAnalysis,
    } = await req.json();

    if (!candidateName || !candidateEmail || !resumeUrl || !jobId || !employerId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if a user with this email already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", candidateEmail.trim())
      .maybeSingle();

    let existingUser: { id: string } | null = existingProfile || null;

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update resume URL if not set
      await supabase
        .from("profiles")
        .update({ resume_url: resumeUrl })
        .eq("id", userId)
        .is("resume_url", null);
    } else {
      // Create a new auth user
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email: candidateEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: candidateName },
      });

      if (authError) {
        // If user already exists in auth but not in profiles, retrieve them
        if (authError.message?.includes('already been registered')) {
          console.log("User exists in auth but not profiles, looking up...");
          const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = allUsers?.users?.find(u => u.email?.toLowerCase() === candidateEmail.toLowerCase().trim());
          if (found) {
            userId = found.id;
            // Ensure profile exists
            await supabase.from("profiles").upsert({
              id: userId,
              full_name: candidateName,
              email: candidateEmail,
              mobile: candidatePhone || null,
              role: "candidate",
              resume_url: resumeUrl,
            }, { onConflict: 'id' });
            await supabase.from("user_roles").upsert({ user_id: userId, role: "candidate" }, { onConflict: 'user_id,role' });
          } else {
            throw new Error("Failed to find existing user account");
          }
        } else {
          console.error("Auth error:", authError);
          throw new Error("Failed to create user account: " + authError.message);
        }
      } else {
        userId = newUser.user.id;

        // Create profile
        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          full_name: candidateName,
          email: candidateEmail,
          mobile: candidatePhone || null,
          role: "candidate",
          resume_url: resumeUrl,
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        // Create user role
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: "candidate",
        });
      }
    }

    // 2. Check for duplicate application
    const { data: existingApp } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", userId)
      .maybeSingle();

    if (existingApp) {
      return new Response(
        JSON.stringify({ success: true, alreadyApplied: true, message: "You have already applied for this job" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create application record
    const { error: appError } = await supabase.from("applications").insert({
      job_id: jobId,
      candidate_id: userId,
      status: "pending",
      cover_letter: coverLetter || null,
    });

    if (appError) {
      console.error("Application insert error:", appError);
    }

    // 4. Get first interview stage (Resume Screening)
    const { data: firstStage } = await supabase
      .from("interview_stages")
      .select("id")
      .order("stage_order", { ascending: true })
      .limit(1)
      .single();

    // 5. Check if interview candidate already exists
    const { data: existingIC } = await supabase
      .from("interview_candidates")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", userId)
      .maybeSingle();

    let interviewCandidateId: string | null = existingIC?.id || null;

    if (!existingIC) {
      const { data: newIC, error: icError } = await supabase.from("interview_candidates").insert({
        job_id: jobId,
        candidate_id: userId,
        resume_url: resumeUrl,
        ai_score: aiScore || null,
        ai_analysis: aiAnalysis || null,
        status: "active",
        current_stage_id: firstStage?.id || null,
      }).select('id').single();

      if (icError) {
        console.error("Interview candidate insert error:", icError);
      } else {
        interviewCandidateId = newIC?.id || null;
      }
    }

    // 6. Get job and company details for email
    const { data: jobData } = await supabase
      .from("jobs")
      .select("job_title, location, salary_range")
      .eq("id", jobId)
      .single();

    const { data: companyData } = await supabase
      .from("profiles")
      .select("company_name, full_name")
      .eq("id", employerId)
      .single();

    const companyName = companyData?.company_name || companyData?.full_name || "the company";
    const jobTitle = jobData?.job_title || "Job Opening";

    // 7. Send confirmation email FIRST before pipeline starts
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
              .header h1 { margin: 0 0 10px; font-size: 28px; }
              .content { background: #ffffff; padding: 30px; }
              .info-card { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
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
                
                <div class="info-card">
                  <h3 style="margin-top: 0; color: #0ea5e9;">📋 Application Details</h3>
                  <p><strong>Position:</strong> ${jobTitle}</p>
                  <p><strong>Company:</strong> ${companyName}</p>
                  ${jobData?.location ? `<p><strong>Location:</strong> ${jobData.location}</p>` : ""}
                  ${jobData?.salary_range ? `<p><strong>Salary:</strong> ${jobData.salary_range}</p>` : ""}
                  <p style="margin-bottom: 0;"><strong>Status:</strong> Under Review ✓</p>
                </div>
                
                <div class="next-steps">
                  <h3>🚀 What Happens Next?</h3>
                  <ol style="margin: 0; padding-left: 20px;">
                    <li>Our AI system will analyze your profile</li>
                    <li>Your skills will be matched with job requirements</li>
                    <li>You will receive your CV/Resume score via email</li>
                    <li>If shortlisted, we'll contact you for an interview</li>
                  </ol>
                </div>
                
                <p style="color: #666;">Keep an eye on your inbox for updates. Your CV analysis results will follow shortly.</p>
              </div>
              <div class="footer">
                <p>Best regards,<br><strong>The ${companyName} Hiring Team</strong></p>
                <p style="font-size: 12px; color: #999;">Powered by Gradia Job Portal</p>
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
            from: 'Gradia Hiring <hr@gradia.co.in>',
            to: [candidateEmail],
            subject: `✅ Application Received: ${jobTitle} at ${companyName}`,
            html: emailHtml,
          }),
        });

        const emailResult = await response.json();
        console.log("Confirmation email sent:", emailResult);
      }
    } catch (emailError) {
      console.error("Confirmation email failed:", emailError);
    }

    // 8. Trigger analyze-resume for AI scoring and pipeline automation AFTER confirmation email
    if (interviewCandidateId) {
      console.log('Triggering analyze-resume for pipeline automation...');
      try {
        const { data: jobDetailsForAnalysis } = await supabase
          .from("jobs")
          .select("job_title, description, requirements, skills, experience_required, location")
          .eq("id", jobId)
          .single();

        const { data: candidateProfile } = await supabase
          .from("profiles")
          .select("full_name, email, experience_level, preferred_role, location, mobile")
          .eq("id", userId)
          .single();

        const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-resume`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidateId: userId,
            jobId,
            resumeUrl,
            candidateProfile: candidateProfile || { full_name: candidateName, email: candidateEmail },
            jobDetails: jobDetailsForAnalysis || {},
          }),
        });
        const analyzeResult = await analyzeResponse.json();
        console.log('Analyze-resume pipeline result:', analyzeResult);
      } catch (pipelineErr) {
        console.error('Failed to trigger pipeline:', pipelineErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: "Application submitted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in submit-qr-application:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
