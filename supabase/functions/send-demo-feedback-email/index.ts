import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DemoFeedbackRequest {
  interviewCandidateId: string;
  feedbackType?: string;
  customSubject?: string;
  customBody?: string;
}

interface PendingReviewRecord {
  id: string;
  reviewer_email: string | null;
}

const roundLabelMap: Record<string, string> = {
  demo: 'Demo Round',
  segment: 'Segment Round',
  admin_academic: 'Admin & Academic Round',
  core_team: 'Core Team Round',
  management: 'Management Round',
};

const roundColorMap: Record<string, { primary: string; gradient: string; border: string }> = {
  demo: { primary: '#be185d', gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', border: '#ec4899' },
  segment: { primary: '#0369a1', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', border: '#0ea5e9' },
  admin_academic: { primary: '#7c3aed', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: '#8b5cf6' },
  core_team: { primary: '#dc2626', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: '#ef4444' },
  management: { primary: '#d97706', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: '#f59e0b' },
};

const bookingTypeMap: Record<string, string[]> = {
  demo: ['demo_round', 'demo_slot_booking', 'Demo Round'],
  segment: ['segment_round', 'segment_slot_booking', 'Segment Round'],
  admin_academic: ['admin_academic_round', 'admin_academic_slot_booking', 'Admin & Academic Round'],
  core_team: ['core_team_round', 'core_team_slot_booking', 'Core Team Round'],
  management: ['management_round', 'management_slot_booking', 'Management Round'],
};

const isValidEmail = (email: string | null | undefined) => Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

const normalizeEmailList = (raw: string | null | undefined) => {
  if (!raw) return [] as string[];

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => isValidEmail(email))
    )
  );
};

const sendEmail = async ({
  resendApiKey,
  to,
  subject,
  html,
  from,
}: {
  resendApiKey: string;
  to: string;
  subject: string;
  html: string;
  from: string;
}) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message || `Resend request failed with status ${response.status}`);
  }

  return result;
};

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

    const { interviewCandidateId, feedbackType, customSubject, customBody }: DemoFeedbackRequest = await req.json();
    const actualFeedbackType = feedbackType || 'demo';
    const roundLabel = roundLabelMap[actualFeedbackType] || 'Demo Round';
    const colors = roundColorMap[actualFeedbackType] || roundColorMap.demo;
    const baseUrl = Deno.env.get('APP_DOMAIN') || 'https://gradia-link-shine.lovable.app';

    console.log('Sending feedback emails for:', interviewCandidateId, 'type:', actualFeedbackType, 'round:', roundLabel);

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
    const candidateName = candidate?.full_name || 'Candidate';
    const candidateEmail = isValidEmail(candidate?.email) ? candidate.email.trim().toLowerCase() : null;
    const fromAddress = `${companyName} <noreply@gradia.co.in>`;

    const { data: existingPendingReviews } = await supabase
      .from('management_reviews')
      .select('id, reviewer_email')
      .eq('interview_candidate_id', interviewCandidateId)
      .eq('feedback_type', actualFeedbackType)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    let observerEmails = Array.from(
      new Set(
        ((existingPendingReviews || []) as PendingReviewRecord[])
          .map((review) => review.reviewer_email?.trim().toLowerCase() || '')
          .filter((email) => isValidEmail(email))
      )
    );

    if (observerEmails.length === 0) {
      const bookingTypes = bookingTypeMap[actualFeedbackType] || bookingTypeMap.demo;
      const { data: roundBooking } = await supabase
        .from('slot_bookings')
        .select('observer_email')
        .eq('candidate_id', interviewCandidate.candidate_id)
        .in('booking_type', bookingTypes)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      observerEmails = normalizeEmailList(roundBooking?.observer_email);

      if (observerEmails.length === 0 && isValidEmail(employer?.email)) {
        observerEmails = [employer.email.trim().toLowerCase()];
      }
    }

    if (observerEmails.length === 0) {
      console.log('No observer emails found for feedback type:', actualFeedbackType);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No observer emails found',
          emailsSent: 0,
          totalObservers: 0,
          roundLabel,
          observerEmails: [],
          candidateEmail,
          candidateEmailSent: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailsSent = 0;

    for (const email of observerEmails) {
      const feedbackToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const existingReview = (existingPendingReviews || []).find(
        (review) => review.reviewer_email?.trim().toLowerCase() === email
      );

      if (existingReview) {
        const { error: reviewError } = await supabase
          .from('management_reviews')
          .update({
            reviewer_email: email,
            reviewer_name: email.split('@')[0],
            feedback_token: feedbackToken,
            feedback_token_expires_at: expiresAt.toISOString(),
            sent_at: new Date().toISOString(),
          })
          .eq('id', existingReview.id);

        if (reviewError) {
          console.error('Error updating review record for', email, ':', reviewError);
          continue;
        }
      } else {
        const { error: reviewError } = await supabase
          .from('management_reviews')
          .insert({
            interview_candidate_id: interviewCandidateId,
            reviewer_email: email,
            reviewer_name: email.split('@')[0],
            feedback_token: feedbackToken,
            feedback_token_expires_at: expiresAt.toISOString(),
            status: 'pending',
            sent_at: new Date().toISOString(),
            feedback_type: actualFeedbackType,
          });

        if (reviewError) {
          console.error('Error creating review record for', email, ':', reviewError);
          continue;
        }
      }

      const feedbackLink = `${baseUrl}/admin/feedback?token=${feedbackToken}`;

      const observerHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: ${colors.gradient}; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">🎯 ${roundLabel} Feedback Required</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">${roundLabel} Evaluation - ${companyName}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        ${customBody ? customBody.split('\n').map((line: string) => `<p style="margin: 0 0 16px;">${line}</p>`).join('') : `<p style="margin: 0 0 16px;">Hello,</p>
        <p style="margin: 0 0 16px;">A candidate has completed their <strong style="color: ${colors.primary};">${roundLabel}</strong> and requires your feedback evaluation:</p>`}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 16px 0; border: 1px solid ${colors.border};">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Candidate</span><br><strong style="font-size: 16px;">${candidateName}</strong><br><span style="color: #6b7280; font-size: 13px;">${candidateEmail || 'N/A'}</span></td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Position</span><br><strong>${job?.job_title || 'N/A'}</strong></td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Company</span><br><strong>${companyName}</strong></td></tr>
                <tr><td style="padding: 8px 0;"><span style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Round</span><br><strong style="color: ${colors.primary};">${roundLabel}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 8px; font-weight: 600; color: #374151;">📋 You will evaluate the candidate on:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 6px;">Overall performance rating (1-5 stars)</li>
          <li style="margin-bottom: 6px;">Communication & presentation skills</li>
          <li style="margin-bottom: 6px;">Subject knowledge & expertise</li>
          <li style="margin-bottom: 6px;">Your recommendation</li>
          <li style="margin-bottom: 6px;">Strengths & areas for improvement</li>
        </ul>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${feedbackLink}" style="display: inline-block; background: ${colors.gradient}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px ${colors.border}4D;">
                📝 Submit ${roundLabel} Feedback
              </a>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; margin: 16px 0;">
          <tr><td style="padding: 12px; font-size: 13px; color: #92400e;">⏰ This feedback link will expire in <strong>7 days</strong>. Please submit your evaluation before then.</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 13px;">If the button doesn't work, copy and paste this link:<br><span style="color: #3b82f6; word-break: break-all;">${feedbackLink}</span></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">${companyName} - Powered by Gradia</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
      try {
        await sendEmail({
          resendApiKey: RESEND_API_KEY,
          from: fromAddress,
          to: email,
          subject: customSubject || `📝 ${roundLabel} Feedback Request - ${candidateName} | ${job?.job_title || ''}`,
          html: observerHtml,
        });
        emailsSent++;
        console.log(`${roundLabel} feedback email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send feedback email to ${email}:`, emailError);
      }
    }

    console.log(`${roundLabel} feedback emails sent: ${emailsSent}/${observerEmails.length} (observers only, no candidate email)`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        totalObservers: observerEmails.length,
        roundLabel,
        observerEmails,
        message: `${roundLabel} feedback request sent to ${emailsSent} observer(s)`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-demo-feedback-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});