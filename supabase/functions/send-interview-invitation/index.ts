import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  interviewCandidateId: string;
  stageName: string;
  scheduledDate: string;
  meetingLink?: string;
}

async function sendEmail(apiKey: string, params: { from: string; to: string[]; reply_to?: string; subject: string; html: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...params,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@gradia.co.in>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interviewCandidateId, stageName, scheduledDate, meetingLink }: InvitationRequest = await req.json();

    console.log('Sending interview invitation:', { interviewCandidateId, stageName, scheduledDate });

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

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Interview link for MCQ test
    const interviewLink = `https://cybqlimobxpjygwcdojv.lovableproject.com/interview?token=${invitationToken}`;

    // Get current stage
    const { data: currentStage } = await supabase
      .from('interview_stages')
      .select('*')
      .eq('id', interviewCandidate.current_stage_id)
      .single();

    // Create interview event
    const { data: interviewEvent, error: eventError } = await supabase
      .from('interview_events')
      .insert({
        interview_candidate_id: interviewCandidateId,
        stage_id: currentStage?.id,
        status: 'scheduled',
        scheduled_at: scheduledDate
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error creating interview event:', eventError);
      throw eventError;
    }

    // Create invitation record
    const { error: invitationError } = await supabase
      .from('interview_invitations')
      .insert({
        interview_event_id: interviewEvent.id,
        invitation_token: invitationToken,
        meeting_link: meetingLink || `https://meet.gradia.com/${invitationToken}`,
        expires_at: expiresAt.toISOString(),
        email_status: 'pending'
      });

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
    }

    // Format date for email
    const formattedDate = new Date(scheduledDate).toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });

    // Send email
    const emailResponse = await sendEmail(RESEND_API_KEY, {
      from: `${companyName} Hiring <noreply@gradia.co.in>`,
      to: [candidate.email],
      reply_to: 'support@gradia.co.in',
      subject: `Interview scheduled for ${job.job_title} at ${companyName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; border-bottom: 1px solid #e5e7eb;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">Interview Invitation</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear ${candidate.full_name},</p>
        
        <p style="margin: 0 0 16px;">You have been selected for the <strong>${stageName}</strong> round for the position of <strong>${job.job_title}</strong> at <strong>${companyName}</strong>.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; margin: 24px 0;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Interview Details</p>
              <p style="margin: 0 0 8px;"><strong>Stage:</strong> ${stageName}</p>
              <p style="margin: 0 0 8px;"><strong>Position:</strong> ${job.job_title}</p>
              <p style="margin: 0 0 8px;"><strong>Format:</strong> Online Assessment (5 MCQ Questions, 60 seconds each)</p>
              <p style="margin: 0 0 8px;"><strong>Deadline:</strong> ${formattedDate} IST</p>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${interviewLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Start Interview</a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 8px; font-weight: 600;">Important Instructions:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px;">
          <li style="margin-bottom: 4px;">Use a desktop/laptop with a stable internet connection</li>
          <li style="margin-bottom: 4px;">Your screen will be recorded during the interview</li>
          <li style="margin-bottom: 4px;">Each question has a 60-second time limit</li>
          <li style="margin-bottom: 4px;">You cannot pause or go back once started</li>
        </ul>
        
        <p style="margin: 0;">Best of luck,<br>The ${companyName} Hiring Team</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:unsubscribe@gradia.co.in?subject=Unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("Interview invitation sent successfully:", emailResponse);

    // Update invitation status
    await supabase
      .from('interview_invitations')
      .update({ 
        email_sent_at: new Date().toISOString(),
        email_status: 'sent'
      })
      .eq('invitation_token', invitationToken);

    return new Response(JSON.stringify({
      success: true,
      emailResponse,
      invitationToken
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending interview invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
