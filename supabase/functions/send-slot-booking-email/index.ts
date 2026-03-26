import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlotBookingEmailRequest {
  interviewCandidateId: string;
  stageName: string;
}

const getPipelineStageNames = (pipelineStages: unknown): string[] => {
  if (!Array.isArray(pipelineStages)) return [];

  return pipelineStages
    .map((stage) => {
      if (stage && typeof stage === 'object' && 'name' in stage) {
        return String((stage as { name?: unknown }).name || '').trim();
      }
      return '';
    })
    .filter(Boolean);
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

    const { interviewCandidateId, stageName }: SlotBookingEmailRequest = await req.json();
    console.log('Sending slot booking email:', { interviewCandidateId, stageName });

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

    const pipelineStageNames = getPipelineStageNames(job?.pipeline_stages);
    const slotBookingStageName = stageName.includes('Slot Booking')
      ? stageName
      : pipelineStageNames.find((name) => name.replace(' Slot Booking', '') === stageName) || `${stageName} Slot Booking`;
    const displayStageName = slotBookingStageName.replace(/\s*Slot Booking$/, '');

    // Get stage ID for the link and determine previous stage name
    let { data: stageData } = await supabase
      .from('interview_stages')
      .select('id, stage_order')
      .eq('name', slotBookingStageName)
      .maybeSingle();

    if (!stageData && slotBookingStageName !== stageName) {
      const { data: fallbackStageData } = await supabase
        .from('interview_stages')
        .select('id, stage_order')
        .eq('name', stageName)
        .maybeSingle();

      stageData = fallbackStageData;
    }

    // Determine the previous stage name dynamically
    let previousStageName = 'the previous round';
    const pipelineStageIndex = pipelineStageNames.findIndex((name) => name === slotBookingStageName || name === stageName);

    if (pipelineStageIndex > 0) {
      previousStageName = pipelineStageNames[pipelineStageIndex - 1];
    } else if (stageData?.stage_order) {
      const { data: prevStage } = await supabase
        .from('interview_stages')
        .select('name')
        .eq('stage_order', stageData.stage_order - 1)
        .maybeSingle();
      if (prevStage?.name) previousStageName = prevStage.name;
    }

    const stageId = stageData?.id || interviewCandidate.current_stage_id;

    // Build the slot booking link
    const baseUrl = Deno.env.get('APP_DOMAIN') || "https://gradia-link-shine.lovable.app";
    const bookSlotLink = `${baseUrl}/book-slot?candidateId=${interviewCandidateId}&stageId=${stageId}&stageName=${encodeURIComponent(displayStageName)}`;

    // Send the email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Gradia Hiring <noreply@gradia.co.in>',
        to: [candidate.email],
        reply_to: 'support@gradia.co.in',
        subject: `📅 Book Your ${displayStageName} Slot - ${job.job_title} at ${companyName}`,
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
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">
          📅 Book Your ${displayStageName} Slot
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">
          ${displayStageName} for ${job.job_title}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear <strong>${candidate.full_name}</strong>,</p>
        
        <p style="margin: 0 0 16px;">Congratulations on clearing the <strong>${previousStageName}</strong> round! 🎉</p>
        
        <p style="margin: 0 0 16px;">You have been selected for the <strong style="color: #1d4ed8;">${displayStageName}</strong> round for the position of <strong>${job.job_title}</strong> at <strong>${companyName}</strong>.</p>
        
        <p style="margin: 0 0 24px;">Please select a convenient date and time for your ${displayStageName} by clicking the button below:</p>
        
        <!-- Details Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; margin: 16px 0; border: 1px solid #3b82f6;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Next Step</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #bfdbfe;">
                    <strong style="color: #374151;">Stage:</strong> <span style="color: #1d4ed8;">${displayStageName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #bfdbfe;">
                    <strong style="color: #374151;">Position:</strong> ${job.job_title}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #bfdbfe;">
                    <strong style="color: #374151;">Format:</strong> ${['HR Round', 'Segment Round', 'Admin & Academic Round', 'Core Team Round', 'Management Round'].some(r => displayStageName.includes(r.replace(' Round', '')) || displayStageName === r) ? 'Live Video Meeting / Interview' : displayStageName === 'Demo Round' ? 'Live Teaching Demo' : 'Technical MCQ Assessment (10 questions)'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Duration:</strong> ${['HR Round', 'Segment Round', 'Admin & Academic Round', 'Core Team Round', 'Management Round'].some(r => displayStageName.includes(r.replace(' Round', '')) || displayStageName === r) ? '15-30 minutes' : displayStageName === 'Demo Round' ? '20-30 minutes' : '15-20 minutes'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${bookSlotLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                📅 Book Your Slot Now
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Instructions -->
        <p style="margin: 24px 0 8px; font-weight: 600; color: #374151;">Important Instructions:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 6px;">Choose a date and time convenient for you</li>
          <li style="margin-bottom: 6px;">Make sure you have a stable internet connection</li>
          <li style="margin-bottom: 6px;">Use a desktop/laptop for the best experience</li>
          <li style="margin-bottom: 6px;">Once booked, you'll receive a confirmation with your interview link</li>
          <li style="margin-bottom: 6px;">Please book your slot within 3 days</li>
        </ul>
        
        <p style="margin: 0; color: #374151;">
          Best of luck!<br>
          <strong>The ${companyName} Hiring Team</strong>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:support@gradia.co.in" style="color: #3b82f6;">Contact Support</a> | 
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
    console.log('Slot booking email sent:', emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Slot booking email sent successfully',
      data: emailResult 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-slot-booking-email:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
