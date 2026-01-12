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
  isManualInterview?: boolean;
  panelAttendeeEmails?: string[];
  assessmentMemberEmails?: string[];
  additionalNotes?: string;
}

// Stage-specific interview formats
const stageFormats: Record<string, { format: string; duration: string; description: string; icon: string }> = {
  'Resume Screening': {
    format: 'Technical MCQ Test',
    duration: '15-20 minutes',
    description: '10 multiple-choice questions covering technical skills, coding concepts, and problem-solving abilities.',
    icon: '💻'
  },
  'Technical Assessment': {
    format: 'Live Panel Interview',
    duration: '30-45 minutes',
    description: 'Live video interview with the hiring panel. Be prepared to discuss your experience and demonstrate your skills.',
    icon: '👥'
  },
  'Demo Video': {
    format: 'Teaching Demo Recording',
    duration: '5-10 minutes',
    description: 'Record a teaching demonstration video (5-10 min) showcasing your teaching methodology and subject expertise.',
    icon: '🎥'
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
  },
  'Panel Interview': {
    format: 'Live Panel Interview',
    duration: '30-45 minutes',
    description: 'Live video interview with the hiring panel. Be prepared to discuss your experience and demonstrate your skills.',
    icon: '👥'
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

    const { 
      interviewCandidateId, 
      stageName, 
      scheduledDate, 
      meetingLink,
      isManualInterview,
      panelAttendeeEmails,
      assessmentMemberEmails,
      additionalNotes
    }: InvitationRequest = await req.json();

    console.log('Sending interview invitation:', { 
      interviewCandidateId, 
      stageName, 
      scheduledDate, 
      isManualInterview,
      panelAttendeeEmails,
      assessmentMemberEmails 
    });

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

    // Get stage-specific format info - use Panel Interview for manual interviews
    const stageFormat = isManualInterview 
      ? stageFormats['Panel Interview']
      : (stageFormats[stageName] || {
          format: 'Online Assessment',
          duration: '15-20 minutes',
          description: 'Complete the assessment within the given time.',
          icon: '📋'
        });

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Interview link - use provided meeting link for manual interviews, or generate app link
    const appDomain = Deno.env.get('APP_DOMAIN') || 'b06fa647-568a-470e-9033-ffe17071d8a6.lovableproject.com';
    const interviewLink = isManualInterview && meetingLink 
      ? meetingLink 
      : `https://${appDomain}/interview?token=${invitationToken}`;

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
        scheduled_at: scheduledDate,
        notes: additionalNotes || null
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

    // Stage-specific instructions - different for manual interviews
    const manualInterviewInstructions = [
      'Join the video call at the scheduled time using the link provided',
      'Ensure you have a stable internet connection and working camera/microphone',
      'Be in a quiet, well-lit environment',
      'Keep your resume and relevant documents ready',
      'Be prepared to discuss your experience and answer questions from the panel'
    ];

    const stageInstructions: Record<string, string[]> = {
      'Resume Screening': [
        'Use a desktop/laptop with stable internet connection',
        'This is a technical MCQ assessment with 10 questions',
        'Each question has a time limit - read carefully before answering',
        'Your screen may be recorded during the assessment',
        'You cannot pause or go back once started'
      ],
      'Technical Assessment': [
        'Join the video call at the scheduled time using the link provided',
        'Ensure you have a stable internet connection and working camera/microphone',
        'Be in a quiet, well-lit environment',
        'Keep your resume and relevant documents ready',
        'Be prepared to discuss your experience and answer technical questions'
      ],
      'Demo Video': [
        'Record a 5-10 minute teaching demonstration video',
        'Choose a topic relevant to the position you applied for',
        'Ensure good lighting and clear audio in your recording',
        'Show your teaching methodology and engagement techniques',
        'You can record multiple takes and upload your best version'
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

    const instructions = isManualInterview 
      ? manualInterviewInstructions 
      : (stageInstructions[stageName] || [
          'Use a desktop/laptop with stable internet connection',
          'Complete the assessment within the given time',
          'Read all questions carefully before answering'
        ]);

    // Build panel details section for manual interviews
    const panelDetailsSection = isManualInterview && (panelAttendeeEmails?.length || assessmentMemberEmails?.length) ? `
      <!-- Panel Details -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border-radius: 8px; margin: 16px 0; border: 1px solid #0ea5e9;">
        <tr>
          <td style="padding: 16px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Interview Panel</p>
            ${panelAttendeeEmails?.length ? `
              <p style="margin: 4px 0; font-size: 13px; color: #374151;">
                <strong>Panel Interviewers:</strong> ${panelAttendeeEmails.join(', ')}
              </p>
            ` : ''}
            ${assessmentMemberEmails?.length ? `
              <p style="margin: 4px 0; font-size: 13px; color: #374151;">
                <strong>Assessment Team:</strong> ${assessmentMemberEmails.join(', ')}
              </p>
            ` : ''}
          </td>
        </tr>
      </table>
    ` : '';

    // Additional notes section
    const additionalNotesSection = additionalNotes ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="padding: 16px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
              <strong>📝 Additional Notes:</strong> ${additionalNotes}
            </p>
          </td>
        </tr>
      </table>
    ` : '';

    // Send email to candidate
    const candidateEmailResponse = await sendEmail(RESEND_API_KEY, {
      from: `${companyName} Hiring <noreply@gradia.co.in>`,
      to: [candidate.email],
      reply_to: 'support@gradia.co.in',
      subject: `${stageFormat.icon} ${isManualInterview ? 'Panel Interview' : stageName} Round - ${job.job_title} at ${companyName}`,
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
          ${stageFormat.icon} ${isManualInterview ? 'Panel Interview Scheduled' : stageName}
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">
          Interview Round for ${job.job_title}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear <strong>${candidate.full_name}</strong>,</p>
        
        <p style="margin: 0 0 16px;">Congratulations! You have been selected for the <strong style="color: #059669;">${isManualInterview ? 'Panel Interview' : stageName}</strong> round for the position of <strong>${job.job_title}</strong> at <strong>${companyName}</strong>.</p>
        
        <!-- Interview Details Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; margin: 24px 0; border: 1px solid #10b981;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Interview Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                    <strong style="color: #374151;">Stage:</strong> <span style="color: #059669;">${isManualInterview ? 'Panel Interview' : stageName}</span>
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
                    <strong style="color: #374151;">Scheduled:</strong> ${formattedDate} IST
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${panelDetailsSection}

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

        ${additionalNotesSection}
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${interviewLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                ${isManualInterview ? 'Join Interview' : 'Start Interview'}
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

    console.log("Candidate invitation sent successfully:", candidateEmailResponse);

    // Send notification to panel attendees if manual interview
    if (isManualInterview && panelAttendeeEmails?.length) {
      const panelEmailResponse = await sendEmail(RESEND_API_KEY, {
        from: `${companyName} Hiring <noreply@gradia.co.in>`,
        to: panelAttendeeEmails,
        reply_to: employer?.email || 'support@gradia.co.in',
        subject: `📅 Panel Interview Scheduled - ${candidate.full_name} for ${job.job_title}`,
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
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">
          👥 Panel Interview Scheduled
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">
          You are invited to interview ${candidate.full_name}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Hello,</p>
        
        <p style="margin: 0 0 16px;">You have been added as a panel member for an upcoming interview. Please find the details below:</p>
        
        <!-- Interview Details Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border-radius: 8px; margin: 24px 0; border: 1px solid #0ea5e9;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Interview Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #bae6fd;">
                    <strong style="color: #374151;">Candidate:</strong> ${candidate.full_name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #bae6fd;">
                    <strong style="color: #374151;">Position:</strong> ${job.job_title}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #bae6fd;">
                    <strong style="color: #374151;">Stage:</strong> ${stageName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Scheduled:</strong> ${formattedDate} IST
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${additionalNotes ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 16px 0;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0; font-size: 13px; color: #92400e;">
                <strong>📝 Notes:</strong> ${additionalNotes}
              </p>
            </td>
          </tr>
        </table>
        ` : ''}
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${meetingLink || interviewLink}" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.3);">
                Join Interview
              </a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0; color: #374151;">
          Thank you,<br>
          <strong>${companyName} Hiring Team</strong>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This is an automated notification from Gradia Job Portal.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      });
      console.log("Panel notification sent:", panelEmailResponse);
    }

    // Send notification to assessment members if manual interview
    if (isManualInterview && assessmentMemberEmails?.length) {
      const assessmentEmailResponse = await sendEmail(RESEND_API_KEY, {
        from: `${companyName} Hiring <noreply@gradia.co.in>`,
        to: assessmentMemberEmails,
        reply_to: employer?.email || 'support@gradia.co.in',
        subject: `📋 Assessment Assignment - ${candidate.full_name} for ${job.job_title}`,
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
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">
          📋 Assessment Assignment
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">
          Please evaluate ${candidate.full_name}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Hello,</p>
        
        <p style="margin: 0 0 16px;">You have been assigned to evaluate a candidate for an upcoming interview. Please find the details below:</p>
        
        <!-- Interview Details Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3ff; border-radius: 8px; margin: 24px 0; border: 1px solid #8b5cf6;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.5px;">Candidate Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe;">
                    <strong style="color: #374151;">Candidate:</strong> ${candidate.full_name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe;">
                    <strong style="color: #374151;">Email:</strong> ${candidate.email}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe;">
                    <strong style="color: #374151;">Position:</strong> ${job.job_title}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd6fe;">
                    <strong style="color: #374151;">Stage:</strong> ${stageName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Interview Date:</strong> ${formattedDate} IST
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${additionalNotes ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 16px 0;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0; font-size: 13px; color: #92400e;">
                <strong>📝 Evaluation Notes:</strong> ${additionalNotes}
              </p>
            </td>
          </tr>
        </table>
        ` : ''}
        
        <p style="margin: 24px 0 16px;">Please prepare your evaluation criteria and be ready to provide feedback after the interview.</p>
        
        <p style="margin: 0; color: #374151;">
          Thank you,<br>
          <strong>${companyName} Hiring Team</strong>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This is an automated notification from Gradia Job Portal.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      });
      console.log("Assessment team notification sent:", assessmentEmailResponse);
    }

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
      emailResponse: candidateEmailResponse,
      invitationToken,
      stageName,
      format: stageFormat.format,
      isManualInterview
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
