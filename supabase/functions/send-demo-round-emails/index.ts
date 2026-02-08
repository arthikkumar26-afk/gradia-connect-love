import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DemoRoundEmailRequest {
  interviewCandidateId: string;
  observerEmail?: string;
  meetLink?: string;
  meetType?: 'ai_video' | 'manual_link';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interviewCandidateId, observerEmail, meetLink, meetType }: DemoRoundEmailRequest = await req.json();
    console.log('Sending demo round emails:', { interviewCandidateId, observerEmail, meetType });

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

    // Get slot booking details for this candidate
    const { data: slotBooking } = await supabase
      .from('slot_bookings')
      .select('*')
      .eq('candidate_id', interviewCandidate.candidate_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const bookingDate = slotBooking?.booking_date 
      ? new Date(slotBooking.booking_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'To be confirmed';
    const bookingTime = slotBooking?.booking_time || 'To be confirmed';

    const baseUrl = "https://gradia-link-shine.lovable.app";
    
    // Determine interview link based on meet type
    const isManualMeet = meetType === 'manual_link' && meetLink;
    const interviewLink = isManualMeet 
      ? meetLink 
      : `${baseUrl}/interview?candidateId=${interviewCandidateId}&type=demo`;

    const emailResults = [];

    // EMAIL 1: Send to candidate
    const candidateEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} Hiring <noreply@gradia.co.in>`,
        to: [candidate.email],
        reply_to: 'support@gradia.co.in',
        subject: `🎥 Demo Round Scheduled - ${job.job_title} at ${companyName}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">🎥 Demo Round</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">Present Your Subject Expertise - ${job.job_title}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear <strong>${candidate.full_name}</strong>,</p>
        <p style="margin: 0 0 16px;">Congratulations on clearing the previous rounds! 🎉 You are now scheduled for the <strong style="color: #be185d;">Demo Round</strong>.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdf2f8; border-radius: 8px; margin: 16px 0; border: 1px solid #ec4899;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #be185d; text-transform: uppercase;">Demo Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #fbcfe8;"><strong>Date:</strong> ${bookingDate}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #fbcfe8;"><strong>Time:</strong> ${bookingTime}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #fbcfe8;"><strong>Format:</strong> ${isManualMeet ? 'Live Video Call' : 'AI Video Demo'}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Duration:</strong> 5-10 minutes</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 8px; font-weight: 600; color: #374151;">What you need to do:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 6px;">Prepare a 5-10 minute teaching/subject demonstration</li>
          <li style="margin-bottom: 6px;">Choose a topic relevant to the position you applied for</li>
          <li style="margin-bottom: 6px;">Ensure good lighting, clear audio, and a quiet environment</li>
          <li style="margin-bottom: 6px;">Showcase your teaching methodology and subject expertise</li>
          ${isManualMeet ? '<li style="margin-bottom: 6px;">Join the meeting link at the scheduled time</li>' : '<li style="margin-bottom: 6px;">Click the button below to start your demo recording</li>'}
        </ul>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${interviewLink}" style="display: inline-block; background-color: #ec4899; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(236, 72, 153, 0.3);">
                ${isManualMeet ? '🔗 Join Demo Meeting' : '🎥 Start Demo Recording'}
              </a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0;">Best of luck!<br><strong>The ${companyName} Hiring Team</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:support@gradia.co.in" style="color: #ec4899;">Contact Support</a>
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

    const candidateResult = await candidateEmailResponse.json();
    emailResults.push({ type: 'candidate', result: candidateResult });
    console.log('Candidate demo email sent:', candidateResult);

    // EMAIL 2: Send to observer/employer if email provided
    const finalObserverEmail = observerEmail || slotBooking?.observer_email;
    
    if (finalObserverEmail) {
      const observerEmailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${companyName} Hiring <noreply@gradia.co.in>`,
          to: [finalObserverEmail],
          reply_to: 'support@gradia.co.in',
          subject: `👁️ Demo Round Observer - ${candidate.full_name} for ${job.job_title}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">👁️ Demo Round - Observer</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">Watch ${candidate.full_name}'s Demo Presentation</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Hello,</p>
        <p style="margin: 0 0 16px;">You have been invited to observe the <strong style="color: #6d28d9;">Demo Round</strong> for candidate <strong>${candidate.full_name}</strong> applying for <strong>${job.job_title}</strong> at <strong>${companyName}</strong>.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3ff; border-radius: 8px; margin: 16px 0; border: 1px solid #8b5cf6;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6d28d9; text-transform: uppercase;">Candidate Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe;"><strong>Candidate:</strong> ${candidate.full_name}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe;"><strong>Position:</strong> ${job.job_title}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe;"><strong>Demo Date:</strong> ${bookingDate}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Time:</strong> ${bookingTime}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 8px; font-weight: 600;">As an observer, you can:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 6px;">Watch the candidate's subject demonstration live</li>
          <li style="margin-bottom: 6px;">Evaluate their teaching methodology and subject expertise</li>
          <li style="margin-bottom: 6px;">Provide feedback through the employer dashboard</li>
        </ul>
        
        ${isManualMeet && meetLink ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${meetLink}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                🔗 Join as Observer
              </a>
            </td>
          </tr>
        </table>
        ` : ''}
        
        <p style="margin: 0;">Best regards,<br><strong>The ${companyName} Hiring Team</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:support@gradia.co.in" style="color: #8b5cf6;">Contact Support</a>
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

      const observerResult = await observerEmailResponse.json();
      emailResults.push({ type: 'observer', result: observerResult });
      console.log('Observer demo email sent:', observerResult);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Demo round emails sent successfully',
      emailsSent: emailResults.length,
      results: emailResults 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-demo-round-emails:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
