import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { interviewCandidateId, preferredSlots } = await req.json();
    console.log('Sending demo slot confirmation:', { interviewCandidateId, preferredSlots });

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
    const employerEmail = employer?.email;

    // Format preferred slots for email
    const slotsHtml = (preferredSlots || []).map((slot: any, i: number) => {
      const date = new Date(slot.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const hour = parseInt(slot.time.split(':')[0]);
      const minute = slot.time.split(':')[1];
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const timeLabel = `${displayHour}:${minute} ${ampm}`;
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <span style="background: #7c3aed; color: white; border-radius: 12px; padding: 2px 10px; font-size: 12px; font-weight: 600;">Option ${i + 1}</span>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">📅 ${date}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">🕐 ${timeLabel} IST</td>
        </tr>`;
    }).join('');

    // Send confirmation email to candidate
    const candidateEmailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">✅ Preferred Timings Submitted</h1>
      <p style="color:#e9d5ff;margin:8px 0 0;font-size:14px;">Demo Slot Booking - ${job?.job_title}</p>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <p style="color:#374151;font-size:15px;">Dear <strong>${candidateName}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;">Your preferred timings for the <strong>Demo Round</strong> at <strong>${companyName}</strong> have been submitted successfully. Here are your chosen slots:</p>
      
      <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Slot</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Date</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Time</th>
          </tr>
        </thead>
        <tbody>${slotsHtml}</tbody>
      </table>

      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:#7c3aed;font-size:13px;margin:0;">
          <strong>📧 What happens next?</strong><br>
          The employer will review your preferred timings and confirm one slot. You'll receive another email with the confirmed date, time, and meeting link.
        </p>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
        ${companyName} Hiring powered by Gradia
      </p>
    </div>
  </div>
</body>
</html>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Gradia Hiring <noreply@gradia.co.in>',
        to: [candidate.email],
        reply_to: 'support@gradia.co.in',
        subject: `✅ Demo Slot Timings Submitted - ${job?.job_title} at ${companyName}`,
        html: candidateEmailHtml,
      }),
    });

    console.log('Candidate confirmation email sent to:', candidate.email);

    // Send notification email to employer
    if (employerEmail) {
      const employerEmailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">📋 New Demo Slot Booking</h1>
      <p style="color:#e9d5ff;margin:8px 0 0;font-size:14px;">${candidateName} has submitted preferred timings</p>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <p style="color:#374151;font-size:15px;">A candidate has submitted their preferred demo timings:</p>
      
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;font-size:14px;"><strong>Candidate:</strong> ${candidateName}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Position:</strong> ${job?.job_title}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Slot</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Date</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Time</th>
          </tr>
        </thead>
        <tbody>${slotsHtml}</tbody>
      </table>

      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:#7c3aed;font-size:13px;margin:0;">
          <strong>Action Required:</strong> Please go to your dashboard → Interview Pipeline → Demo Slot Booking to review and confirm one timing, then send the meeting link.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Gradia Hiring <noreply@gradia.co.in>`,
          to: [employerEmail],
          reply_to: 'support@gradia.co.in',
          subject: `📋 Demo Slot Booking: ${candidateName} - ${job?.job_title}`,
          html: employerEmailHtml,
        }),
      });

      console.log('Employer notification email sent to:', employerEmail);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending demo slot confirmation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
