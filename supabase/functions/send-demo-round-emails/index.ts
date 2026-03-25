import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DemoRoundEmailRequest {
  interviewCandidateId: string;
  observerEmail?: string;
  meetLink?: string;
  meetType?: 'ai_video' | 'manual_link';
  roundName?: string;
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

    const { interviewCandidateId, observerEmail, meetLink, meetType, roundName }: DemoRoundEmailRequest = await req.json();
    const actualRoundName = roundName || 'Demo Round';
    console.log('Sending round emails:', { interviewCandidateId, observerEmail, meetType, roundName: actualRoundName });

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

    // Get slot booking details - filter by round-specific booking types
    const roundBookingTypeMap: Record<string, string[]> = {
      'Demo Round': ['demo_round', 'demo_slot_booking', 'Demo Round'],
      'Segment Round': ['segment_round', 'segment_slot_booking', 'Segment Round'],
      'Admin & Academic Round': ['admin_academic_round', 'admin_academic_slot_booking', 'Admin & Academic Round'],
      'HR Round': ['hr_round', 'hr_slot_booking', 'HR Round'],
      'Core Team Round': ['core_team_round', 'core_team_slot_booking', 'Core Team Round'],
      'Management Round': ['management_round', 'management_slot_booking', 'Management Round'],
    };

    const bookingTypes = roundBookingTypeMap[actualRoundName] || [];

    let slotBooking: any = null;
    if (bookingTypes.length > 0) {
      const { data } = await supabase
        .from('slot_bookings')
        .select('*')
        .eq('candidate_id', interviewCandidate.candidate_id)
        .in('booking_type', bookingTypes)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      slotBooking = data;
    }

    // Fallback: get latest slot booking if round-specific not found
    if (!slotBooking) {
      const { data } = await supabase
        .from('slot_bookings')
        .select('*')
        .eq('candidate_id', interviewCandidate.candidate_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      slotBooking = data;
    }

    const bookingDate = slotBooking?.booking_date 
      ? new Date(slotBooking.booking_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'To be confirmed';
    const bookingTime = slotBooking?.booking_time || 'To be confirmed';

    const baseUrl = Deno.env.get('APP_DOMAIN') || "https://gradia-link-shine.lovable.app";

    // Get stage ID for the round
    const { data: roundStage } = await supabase
      .from('interview_stages')
      .select('id')
      .eq('name', actualRoundName)
      .maybeSingle();

    // Determine interview link based on meet type
    const isManualMeet = meetType === 'manual_link' && meetLink;
    const roundStageId = roundStage?.id || interviewCandidate.current_stage_id;
    const interviewLink = isManualMeet 
      ? meetLink 
      : `${baseUrl}/interview?candidateId=${interviewCandidateId}&stageId=${roundStageId}&type=demo`;

    // Color themes per round
    const roundColors: Record<string, { primary: string; bg: string; border: string; gradient: string }> = {
      'Demo Round': { primary: '#be185d', bg: '#fdf2f8', border: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' },
      'Segment Round': { primary: '#0369a1', bg: '#f0f9ff', border: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)' },
      'Admin & Academic Round': { primary: '#7c3aed', bg: '#f5f3ff', border: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
      'HR Round': { primary: '#059669', bg: '#ecfdf5', border: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
      'Core Team Round': { primary: '#dc2626', bg: '#fef2f2', border: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
      'Management Round': { primary: '#d97706', bg: '#fffbeb', border: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    };
    const colors = roundColors[actualRoundName] || roundColors['Demo Round'];

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
        subject: `🎥 ${actualRoundName} Scheduled - ${job.job_title} at ${companyName}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: ${colors.gradient}; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">🎥 ${actualRoundName}</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">${actualRoundName} - ${job.job_title}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear <strong>${candidate.full_name}</strong>,</p>
        <p style="margin: 0 0 16px;">Congratulations on clearing the previous rounds! 🎉 You are now scheduled for the <strong style="color: ${colors.primary};">${actualRoundName}</strong>.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.bg}; border-radius: 8px; margin: 16px 0; border: 1px solid ${colors.border};">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: ${colors.primary}; text-transform: uppercase;">${actualRoundName} Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid ${colors.border}33;"><strong>Date:</strong> ${bookingDate}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid ${colors.border}33;"><strong>Time:</strong> ${bookingTime}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid ${colors.border}33;"><strong>Format:</strong> ${isManualMeet ? 'Live Video Call' : 'AI Video Demo'}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Duration:</strong> 5-10 minutes</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 16px 0 8px; font-weight: 600; color: #374151;">What you need to do:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 6px;">Be prepared for the ${actualRoundName} session</li>
          <li style="margin-bottom: 6px;">Ensure good lighting, clear audio, and a quiet environment</li>
          <li style="margin-bottom: 6px;">Have your documents and credentials ready</li>
          ${isManualMeet ? '<li style="margin-bottom: 6px;">Join the meeting link at the scheduled time</li>' : '<li style="margin-bottom: 6px;">Click the button below to start your session</li>'}
        </ul>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${interviewLink}" style="display: inline-block; background-color: ${colors.border}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px ${colors.border}4D;">
                ${isManualMeet ? `🔗 Join ${actualRoundName} Meeting` : `🎥 Start ${actualRoundName} Recording`}
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
          <a href="mailto:support@gradia.co.in" style="color: ${colors.border};">Contact Support</a>
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
    console.log('Candidate round email sent:', candidateResult);

    // EMAIL 2: Send to observer/employer emails (supports multiple comma-separated)
    const rawObserverEmails = observerEmail || slotBooking?.observer_email;
    const observerEmailList = rawObserverEmails 
      ? rawObserverEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
      : [];
    
    console.log(`Observer emails for ${actualRoundName}:`, observerEmailList);

    for (const singleObserverEmail of observerEmailList) {
      const observerEmailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${companyName} Hiring <noreply@gradia.co.in>`,
          to: [singleObserverEmail],
          reply_to: 'support@gradia.co.in',
          subject: `👁️ ${actualRoundName} Observer - ${candidate.full_name} for ${job.job_title}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: ${colors.gradient}; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">👁️ ${actualRoundName} - Observer</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">Watch ${candidate.full_name}'s ${actualRoundName} Presentation</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Hello,</p>
        <p style="margin: 0 0 16px;">You have been invited to observe the <strong style="color: ${colors.primary};">${actualRoundName}</strong> for candidate <strong>${candidate.full_name}</strong> applying for <strong>${job.job_title}</strong> at <strong>${companyName}</strong>.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.bg}; border-radius: 8px; margin: 16px 0; border: 1px solid ${colors.border};">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: ${colors.primary}; text-transform: uppercase;">Candidate Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid ${colors.border}33;"><strong>Candidate:</strong> ${candidate.full_name}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid ${colors.border}33;"><strong>Position:</strong> ${job.job_title}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid ${colors.border}33;"><strong>${actualRoundName} Date:</strong> ${bookingDate}</td></tr>
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
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${interviewLink}" style="display: inline-block; background-color: ${colors.border}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px ${colors.border}4D;">
                ${isManualMeet ? `🔗 Join Meeting as Observer` : `🎥 Watch Live ${actualRoundName}`}
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
          <a href="mailto:support@gradia.co.in" style="color: ${colors.border};">Contact Support</a>
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
      console.log(`Observer ${actualRoundName} email sent to ${singleObserverEmail}:`, observerResult);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${actualRoundName} emails sent successfully`,
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
