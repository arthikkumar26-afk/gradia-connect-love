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

async function sendEmail(apiKey: string, params: { from: string; to: string[]; subject: string; html: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
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
      subject: `Interview Invitation: ${stageName} for ${job.job_title} at ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Interview Invitation</h1>
              <p>Congratulations on advancing to the next stage!</p>
            </div>
            <div class="content">
              <p>Dear <strong>${candidate.full_name}</strong>,</p>
              
              <p>We are pleased to inform you that you have been selected for the <strong>${stageName}</strong> round for the position of <strong>${job.job_title}</strong> at <strong>${companyName}</strong>.</p>
              
              <div class="highlight">
                <h3 style="margin-top: 0;">📅 Interview Details</h3>
                <p><strong>Stage:</strong> ${stageName}</p>
                <p><strong>Position:</strong> ${job.job_title}</p>
                <p><strong>Date & Time:</strong> ${formattedDate} IST</p>
                ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
              </div>
              
              <h3>📝 Preparation Tips</h3>
              <ul>
                <li>Review the job description and requirements</li>
                <li>Prepare examples of your relevant experience</li>
                <li>Have questions ready about the role and company</li>
                <li>Test your audio/video setup before the interview</li>
              </ul>
              
              ${meetingLink ? `<a href="${meetingLink}" class="btn">Join Interview</a>` : ''}
              
              <div class="footer">
                <p>Best of luck with your interview!</p>
                <p>The ${companyName} Hiring Team</p>
              </div>
            </div>
          </div>
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
