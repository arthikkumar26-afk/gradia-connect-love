import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeErrorMessage } from "../_shared/safeError.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HRRoundEmailRequest {
  interviewCandidateId: string;
  observerEmail?: string;
  meetLink?: string;
  meetType?: string;
  confirmedDate?: string;
  confirmedTime?: string;
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

    const { interviewCandidateId, observerEmail, meetLink, meetType, confirmedDate, confirmedTime }: HRRoundEmailRequest = await req.json();
    console.log('Sending HR round emails:', { interviewCandidateId, observerEmail, meetType, meetLink });

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

    // Get slot booking details for HR round
    const { data: slotBookings } = await supabase
      .from('slot_bookings')
      .select('*')
      .eq('candidate_id', interviewCandidate.candidate_id)
      .order('created_at', { ascending: false });

    const slotBooking = slotBookings?.find(b => b.subject?.toLowerCase().includes('hr')) || slotBookings?.[0] || null;

    const rawDate = confirmedDate || slotBooking?.booking_date;
    const bookingDate = rawDate
      ? new Date(rawDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'To be confirmed';
    const bookingTime = confirmedTime || slotBooking?.booking_time || 'To be confirmed';
    const meetTypeLabel = meetType === 'zoom_meet' ? 'Zoom Meeting' : 'Google Meet';

    const baseUrl = "https://gradia-link-shine.lovable.app";

    const { data: hrStage } = await supabase
      .from('interview_stages')
      .select('id')
      .eq('name', 'HR Round')
      .single();

    // HR Round is always a live meeting, not an assessment
    const hrStageId = hrStage?.id || interviewCandidate.current_stage_id;
    const interviewLink = meetLink || `${baseUrl}/interview?candidateId=${interviewCandidateId}&stageId=${hrStageId}&type=hr`;

    const emailResults = [];

    // EMAIL 1: Send to candidate
    const candidateEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Gradia Hiring <noreply@gradia.co.in>',
        to: [candidate.email],
        reply_to: 'info@gradiaa.com',
        subject: `📋 HR Round Scheduled - ${job.job_title} at ${companyName}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">📋 HR Round</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">Interview & Discussion - ${job.job_title}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear <strong>${candidate.full_name}</strong>,</p>
        <p style="margin: 0 0 16px;">Congratulations on your progress! 🎉 You are now scheduled for the <strong style="color: #4338ca;">HR Round</strong>.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eef2ff; border-radius: 8px; margin: 16px 0; border: 1px solid #6366f1;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #4338ca; text-transform: uppercase;">HR Round Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #c7d2fe;"><strong>Date:</strong> ${bookingDate}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #c7d2fe;"><strong>Time:</strong> ${bookingTime}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #c7d2fe;"><strong>Format:</strong> Live Video Meeting</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Duration:</strong> 15-30 minutes</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 8px; font-weight: 600; color: #374151;">What to prepare:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 6px;">Review your salary expectations and notice period</li>
          <li style="margin-bottom: 6px;">Be ready to discuss your career goals and motivations</li>
          <li style="margin-bottom: 6px;">Prepare questions about the role and company</li>
          <li style="margin-bottom: 6px;">Ensure good internet, clear audio, and a quiet environment</li>
          <li style="margin-bottom: 6px;">Join the meeting link at the scheduled time</li>
        </ul>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${interviewLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                🔗 Join HR Meeting
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
          <a href="mailto:info@gradiaa.com" style="color: #6366f1;">Contact Support</a>
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
    console.log('Candidate HR email sent:', candidateResult);

    // EMAIL 2: Send to observer/employer emails (supports multiple comma-separated)
    const rawObserverEmails = observerEmail || slotBooking?.observer_email;
    const observerEmailList = rawObserverEmails 
      ? rawObserverEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
      : [];
    
    for (const singleObserverEmail of observerEmailList) {
      const observerEmailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Gradia Hiring <noreply@gradia.co.in>',
          to: [singleObserverEmail],
          reply_to: 'info@gradiaa.com',
          subject: `👁️ HR Round Observer - ${candidate.full_name} for ${job.job_title}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">👁️ HR Round - Observer</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">Observe ${candidate.full_name}'s HR Interview</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Hello,</p>
        <p style="margin: 0 0 16px;">You have been invited to observe the <strong style="color: #4338ca;">HR Round</strong> for candidate <strong>${candidate.full_name}</strong> applying for <strong>${job.job_title}</strong> at <strong>${companyName}</strong>.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eef2ff; border-radius: 8px; margin: 16px 0; border: 1px solid #6366f1;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #4338ca; text-transform: uppercase;">Interview Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #c7d2fe;"><strong>Candidate:</strong> ${candidate.full_name}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #c7d2fe;"><strong>Position:</strong> ${job.job_title}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #c7d2fe;"><strong>Date:</strong> ${bookingDate}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Time:</strong> ${bookingTime}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 8px; font-weight: 600;">As an observer, you can:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 6px;">Watch the candidate's HR interview live</li>
          <li style="margin-bottom: 6px;">Evaluate communication skills and cultural fit</li>
          <li style="margin-bottom: 6px;">Provide feedback through the employer dashboard</li>
        </ul>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${interviewLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                🔗 Join Meeting as Observer
              </a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0;">Best regards,<br><strong>The ${companyName} Hiring Team</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:info@gradiaa.com" style="color: #6366f1;">Contact Support</a>
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
      emailResults.push({ type: 'observer', email: singleObserverEmail, result: observerResult });
      console.log(`Observer HR email sent to ${singleObserverEmail}:`, observerResult);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'HR round emails sent successfully',
      emailsSent: emailResults.length,
      results: emailResults 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-hr-round-emails:', error);
    return new Response(JSON.stringify({ 
      error: safeErrorMessage(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});