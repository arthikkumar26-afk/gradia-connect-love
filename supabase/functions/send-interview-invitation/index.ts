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

// Stage-specific interview formats
const stageFormats: Record<string, { format: string; duration: string; description: string; icon: string }> = {
  'Resume Screening': {
    format: 'AI Resume Analysis',
    duration: '5-10 minutes',
    description: 'Your resume will be evaluated by our AI system for skill matching and experience assessment.',
    icon: '📄'
  },
  'Technical Assessment': {
    format: 'Technical MCQ Test',
    duration: '15-20 minutes',
    description: '10 multiple-choice questions covering technical skills, coding concepts, and problem-solving.',
    icon: '💻'
  },
  'HR Round': {
    format: 'HR Assessment',
    duration: '10-15 minutes',
    description: '5 questions about communication, teamwork, and cultural fit. Some questions may require text responses.',
    icon: '👥'
  },
  'Final Review': {
    format: 'Final Evaluation',
    duration: '10-15 minutes',
    description: 'Comprehensive assessment combining technical and soft skills evaluation.',
    icon: '🎯'
  },
  'Offer Stage': {
    format: 'Offer Discussion',
    duration: '15-20 minutes',
    description: 'Review and discussion of the offer details with the hiring team.',
    icon: '🎁'
  }
};

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

    // Get stage-specific format info
    const stageFormat = stageFormats[stageName] || {
      format: 'Online Assessment',
      duration: '15-20 minutes',
      description: 'Complete the assessment within the given time.',
      icon: '📋'
    };

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Interview link - use the app domain
    const appDomain = Deno.env.get('APP_DOMAIN') || 'b06fa647-568a-470e-9033-ffe17071d8a6.lovableproject.com';
    const interviewLink = `https://${appDomain}/interview?token=${invitationToken}`;

    // Get or create stage
    const { data: stageData } = await supabase
      .from('interview_stages')
      .select('*')
      .eq('name', stageName)
      .single();

    const stageId = stageData?.id || interviewCandidate.current_stage_id;

    // Create interview event
    const { data: interviewEvent, error: eventError } = await supabase
      .from('interview_events')
      .insert({
        interview_candidate_id: interviewCandidateId,
        stage_id: stageId,
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
        meeting_link: meetingLink || interviewLink,
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

    // Stage-specific instructions
    const stageInstructions: Record<string, string[]> = {
      'Resume Screening': [
        'Ensure your resume is up to date',
        'Your profile will be evaluated automatically',
        'Results will be shared within 24 hours'
      ],
      'Technical Assessment': [
        'Use a desktop/laptop with stable internet connection',
        'Your screen may be recorded during the assessment',
        'Each question has a time limit - read carefully',
        'You cannot pause or go back once started'
      ],
      'HR Round': [
        'Be prepared to answer behavioral questions',
        'Some questions may require detailed text responses',
        'Focus on your communication and teamwork skills',
        'Be honest about your experience and expectations'
      ],
      'Final Review': [
        'This is the final assessment before the offer stage',
        'Review all your previous submissions',
        'Be ready for comprehensive evaluation',
        'Prepare any questions you have for the team'
      ],
      'Offer Stage': [
        'Review the offer details carefully',
        'Prepare your questions about compensation and benefits',
        'Have your joining timeline ready',
        'Bring any documents if requested'
      ]
    };

    const instructions = stageInstructions[stageName] || [
      'Use a desktop/laptop with stable internet connection',
      'Complete the assessment within the given time',
      'Read all questions carefully before answering'
    ];

    // Send email with stage-specific content
    const emailResponse = await sendEmail(RESEND_API_KEY, {
      from: `${companyName} Hiring <noreply@gradia.co.in>`,
      to: [candidate.email],
      reply_to: 'support@gradia.co.in',
      subject: `${stageFormat.icon} ${stageName} Round - ${job.job_title} at ${companyName}`,
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
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">
          ${stageFormat.icon} ${stageName}
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">
          Interview Round for ${job.job_title}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear <strong>${candidate.full_name}</strong>,</p>
        
        <p style="margin: 0 0 16px;">Congratulations! You have been selected for the <strong style="color: #059669;">${stageName}</strong> round for the position of <strong>${job.job_title}</strong> at <strong>${companyName}</strong>.</p>
        
        <!-- Interview Details Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; margin: 24px 0; border: 1px solid #10b981;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Interview Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                    <strong style="color: #374151;">Stage:</strong> <span style="color: #059669;">${stageName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                    <strong style="color: #374151;">Position:</strong> ${job.job_title}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                    <strong style="color: #374151;">Format:</strong> ${stageFormat.format}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                    <strong style="color: #374151;">Duration:</strong> ${stageFormat.duration}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Complete By:</strong> ${formattedDate} IST
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Stage Description -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin: 16px 0;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">
                <strong>What to expect:</strong> ${stageFormat.description}
              </p>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${interviewLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                Start ${stageName}
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Instructions -->
        <p style="margin: 24px 0 8px; font-weight: 600; color: #374151;">Important Instructions:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          ${instructions.map(inst => `<li style="margin-bottom: 6px;">${inst}</li>`).join('')}
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
          <a href="mailto:support@gradia.co.in" style="color: #10b981;">Contact Support</a> | 
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
      invitationToken,
      stageName,
      format: stageFormat.format
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
