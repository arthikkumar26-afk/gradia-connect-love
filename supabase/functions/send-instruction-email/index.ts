import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interviewCandidateId } = await req.json();

    if (!interviewCandidateId) {
      throw new Error('interviewCandidateId is required');
    }

    // Get candidate and job details
    const { data: interviewCandidate, error: candidateError } = await supabase
      .from('interview_candidates')
      .select(`
        *,
        candidate:profiles(*),
        job:jobs(*, employer:profiles!jobs_employer_id_fkey(*))
      `)
      .eq('id', interviewCandidateId)
      .single();

    if (candidateError || !interviewCandidate) {
      throw new Error('Interview candidate not found');
    }

    const candidate = interviewCandidate.candidate;
    const job = interviewCandidate.job;
    const employer = job?.employer;
    const companyName = employer?.company_name || 'Gradia';
    const baseUrl = "https://gradia-link-shine.lovable.app";
    const signupUrl = `${baseUrl}/candidate/signup`;

    // Send instruction email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} Hiring <noreply@gradia.co.in>`,
        to: [candidate.email],
        reply_to: 'support@gradia.co.in',
        subject: `📋 Interview Instructions - ${job.job_title} at ${companyName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">
          📋 Interview Instructions
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">
          ${job.job_title} at ${companyName}
        </p>
      </td>
    </tr>
    
    <!-- Body -->
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear <strong>${candidate.full_name}</strong>,</p>
        
        <p style="margin: 0 0 16px;">Congratulations on being shortlisted for the position of <strong style="color: #2563eb;">${job.job_title}</strong> at <strong>${companyName}</strong>! We are excited to begin your interview process.</p>
        
        <!-- Important: Create Account -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 24px 0; border: 1px solid #f59e0b;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #92400e;">⚠️ IMPORTANT: Create Your Gradia Account</p>
              <p style="margin: 0 0 12px; font-size: 13px; color: #78350f;">
                Before proceeding with the interview, please create your Gradia candidate account. This account is required for interview monitoring, tracking your progress, and receiving interview updates.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${signupUrl}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                      Create Gradia Account →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Interview Process Overview -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; margin: 24px 0; border: 1px solid #2563eb;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Your Interview Journey</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                    <strong>Step 1:</strong> 📋 Interview Guidelines (You are here)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                    <strong>Step 2:</strong> 📄 CV/Resume — AI-powered resume analysis
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                    <strong>Step 3:</strong> 💻 Written Test — MCQ-based test
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                    <strong>Step 4:</strong> 👥 HR Round — Behavioral interview
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                    <strong>Step 5:</strong> 🎥 Viva — Video interview
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #374151;">
                    <strong>Step 6:</strong> 🎯 Final Review & Offer
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Preparation Tips -->
        <p style="margin: 24px 0 8px; font-weight: 600; color: #374151;">📌 Interview Preparation Tips:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 8px;">Keep your updated resume ready (PDF format preferred)</li>
          <li style="margin-bottom: 8px;">Ensure stable internet connection for online assessments</li>
          <li style="margin-bottom: 8px;">Use a laptop/desktop with a working webcam and microphone</li>
          <li style="margin-bottom: 8px;">Choose a quiet, well-lit location for video rounds</li>
          <li style="margin-bottom: 8px;">Review the job description and required skills thoroughly</li>
          <li style="margin-bottom: 8px;">Be prepared with examples of your past projects and achievements</li>
          <li style="margin-bottom: 8px;">Keep your government ID proof handy for verification</li>
        </ul>

        <!-- Technical Requirements -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin: 16px 0;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-weight: 600; font-size: 13px; color: #374151;">🖥️ Technical Requirements:</p>
              <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #6b7280;">
                <li style="margin-bottom: 4px;">Google Chrome or Mozilla Firefox browser (latest version)</li>
                <li style="margin-bottom: 4px;">Webcam and microphone access permission</li>
                <li style="margin-bottom: 4px;">Screen sharing capability for assessments</li>
                <li style="margin-bottom: 4px;">Minimum internet speed: 2 Mbps</li>
              </ul>
            </td>
          </tr>
        </table>

        <!-- Job Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; margin: 24px 0; border: 1px solid #10b981;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Position Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 4px 0; font-size: 13px;">
                    <strong>Position:</strong> ${job.job_title}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px;">
                    <strong>Company:</strong> ${companyName}
                  </td>
                </tr>
                ${job.location ? `<tr><td style="padding: 4px 0; font-size: 13px;"><strong>Location:</strong> ${job.location}</td></tr>` : ''}
                ${job.job_type ? `<tr><td style="padding: 4px 0; font-size: 13px;"><strong>Type:</strong> ${job.job_type}</td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 8px; color: #374151;">
          You will receive further emails with specific instructions for each round as you progress through the interview stages.
        </p>
        
        <p style="margin: 16px 0 0; color: #374151;">
          Best of luck!<br>
          <strong>The ${companyName} Hiring Team</strong>
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:support@gradia.co.in" style="color: #2563eb;">Contact Support</a> | 
          <a href="mailto:unsubscribe@gradia.co.in?subject=Unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@gradia.co.in>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    const emailResult = await emailResponse.json();
    console.log('Instruction email sent:', emailResult);

    // Mark the Interview Guidelines stage as completed and create an event
    const { data: instructionStage } = await supabase
      .from('interview_stages')
      .select('id')
      .eq('name', 'Interview Guidelines')
      .single();

    if (instructionStage) {
      // Create an event for the instruction round
      await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidateId,
          stage_id: instructionStage.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: 'Instruction email sent to candidate',
        });
    }

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-instruction-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
