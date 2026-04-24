import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const { interviewCandidateId, confirmedDate, confirmedTime } = await req.json();
    console.log('Sending demo slot confirmed email:', { interviewCandidateId, confirmedDate, confirmedTime });

    // Get candidate and job details
    const { data: ic, error: icError } = await supabase
      .from('interview_candidates')
      .select(`
        *,
        candidate:profiles(*),
        job:jobs(*, employer:profiles!jobs_employer_id_fkey(*))
      `)
      .eq('id', interviewCandidateId)
      .single();

    if (icError || !ic) throw new Error('Interview candidate not found');

    const candidate = ic.candidate;
    const job = ic.job;
    const employer = job?.employer;
    const companyName = job?.organisation || employer?.company_name || 'Gradia';
    const candidateName = candidate?.full_name || 'Candidate';
    const candidateEmail = candidate?.email;

    if (!candidateEmail) throw new Error('Candidate email not found');

    // Format confirmed date and time
    const formattedDate = new Date(confirmedDate + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const hour = parseInt(confirmedTime.split(':')[0]);
    const minute = confirmedTime.split(':')[1];
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const formattedTime = `${displayHour}:${minute} ${ampm} IST`;

    const jobTitle = job?.job_title || 'the position';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    
    <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;">🎉 Demo Slot Confirmed!</h1>
      <p style="color:#e9d5ff;margin:8px 0 0;font-size:14px;">${companyName}</p>
    </div>

    <div style="padding:32px 24px;">
      <p style="font-size:16px;color:#1e293b;margin:0 0 16px;">Dear <strong>${candidateName}</strong>,</p>
      
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">
        Great news! Your demo round timing for <strong>${jobTitle}</strong> has been confirmed by the employer. Please find the details below:
      </p>

      <div style="background:#f5f3ff;border:2px solid #c4b5fd;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Confirmed Schedule</p>
        <p style="margin:0 0 4px;font-size:20px;color:#1e293b;font-weight:700;">📅 ${formattedDate}</p>
        <p style="margin:0;font-size:20px;color:#7c3aed;font-weight:700;">🕐 ${formattedTime}</p>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 24px;">
        <p style="margin:0;font-size:13px;color:#166534;font-weight:600;">📋 Please Note:</p>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#15803d;line-height:1.8;">
          <li>Please be available 10 minutes before the scheduled time</li>
          <li>Ensure a stable internet connection and quiet environment</li>
          <li>Keep your teaching materials and resources ready</li>
          <li>You will receive further instructions closer to the demo date</li>
        </ul>
      </div>

      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px;">
        If you have any questions or need to reschedule, please contact us at the earliest.
      </p>
      
      <p style="font-size:14px;color:#475569;margin:24px 0 0;">
        Best regards,<br/>
        <strong>${companyName} Recruitment Team</strong>
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">This is an automated email from ${companyName} via Gradia.</p>
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <notifications@gradia.co.in>`,
        to: [candidateEmail],
        subject: `✅ Demo Slot Confirmed - ${formattedDate} at ${formattedTime}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailRes.json();
    console.log('Demo slot confirmed email sent:', emailData);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending demo slot confirmed email:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
