import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DemoFeedbackRequest {
  interviewCandidateId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const resend = new Resend(RESEND_API_KEY);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interviewCandidateId }: DemoFeedbackRequest = await req.json();
    console.log('Sending demo feedback emails for:', interviewCandidateId);

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
    const candidateName = candidate?.full_name || 'Candidate';
    const candidateEmail = candidate?.email || '';

    // Get observer emails from demo slot booking
    const { data: demoBooking } = await supabase
      .from('slot_bookings')
      .select('observer_email')
      .eq('candidate_id', interviewCandidate.candidate_id)
      .in('booking_type', ['demo_round', 'demo_slot_booking', 'Demo Round'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Collect observer emails
    const observerEmailsRaw = demoBooking?.observer_email || employer?.email || '';
    const observerEmails = observerEmailsRaw
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    if (observerEmails.length === 0) {
      // Fallback to employer email
      if (employer?.email) {
        observerEmails.push(employer.email);
      } else {
        console.log('No observer emails found');
        return new Response(
          JSON.stringify({ message: 'No observer emails found', count: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Sending feedback requests to ${observerEmails.length} observers:`, observerEmails);

    const baseUrl = "https://gradia-link-shine.lovable.app";
    let emailsSent = 0;

    for (const email of observerEmails) {
      // Create feedback token
      const feedbackToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create management_review record linked to interview_candidate_id
      const { error: reviewError } = await supabase
        .from('management_reviews')
        .insert({
          interview_candidate_id: interviewCandidateId,
          reviewer_email: email,
          reviewer_name: email.split('@')[0],
          feedback_token: feedbackToken,
          feedback_token_expires_at: expiresAt.toISOString(),
          status: 'pending',
          sent_at: new Date().toISOString()
        });

      if (reviewError) {
        console.error('Error creating review record for', email, ':', reviewError);
        continue;
      }

      const feedbackLink = `${baseUrl}/admin/feedback?token=${feedbackToken}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-card { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { font-size: 16px; font-weight: 600; color: #1f2937; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .expire-note { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 6px; margin: 15px 0; font-size: 13px; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎯 Feedback Required</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Demo Round Evaluation - ${companyName}</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>A candidate has completed their <strong>Demo Round</strong> and requires your feedback:</p>
              
              <div class="info-card">
                <div style="margin-bottom: 15px;">
                  <p class="label">Candidate</p>
                  <p class="value">${candidateName}</p>
                  <p style="color: #6b7280; font-size: 14px;">${candidateEmail}</p>
                </div>
                <div style="margin-bottom: 15px;">
                  <p class="label">Position</p>
                  <p class="value">${job?.job_title || 'N/A'}</p>
                </div>
                <div>
                  <p class="label">Company</p>
                  <p class="value">${companyName}</p>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${feedbackLink}" class="button">📝 Submit Your Feedback</a>
              </div>
              
              <div class="expire-note">
                ⏰ This feedback link will expire in <strong>7 days</strong>. Please submit your evaluation before then.
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                If the button doesn't work, copy and paste this link:<br>
                <span style="color: #3b82f6; word-break: break-all;">${feedbackLink}</span>
              </p>
            </div>
            <div class="footer">
              <p>${companyName} - Powered by Gradia</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: `${companyName} <noreply@gradia.co.in>`,
          to: [email],
          subject: `📝 Demo Feedback Request - ${candidateName} | ${job?.job_title || ''}`,
          html: htmlContent,
        });
        emailsSent++;
        console.log(`Feedback email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }

    console.log(`Demo feedback emails sent: ${emailsSent}/${observerEmails.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        totalObservers: observerEmails.length,
        message: `Feedback request sent to ${emailsSent} observer(s)`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-demo-feedback-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
