import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to send email via Resend REST API
async function sendEmail(to: string, subject: string, html: string, fromName: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <noreply@gradia.co.in>`,
      to: [to],
      reply_to: 'support@gradia.co.in',
      subject,
      html,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@gradia.co.in>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });
  return response.json();
}

interface StatusNotificationRequest {
  candidateId: string;
  jobId: string;
  status: 'applied' | 'shortlisted' | 'interview_scheduled' | 'offer_received' | 'rejected' | 'hired';
  additionalInfo?: {
    interviewDate?: string;
    interviewType?: string;
    meetingLink?: string;
    salary?: string;
    startDate?: string;
    rejectionReason?: string;
  };
}

const getEmailContent = (
  status: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  additionalInfo?: any
) => {
  const wrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; border-bottom: 1px solid #e5e7eb;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">Application Update</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        ${content}
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:unsubscribe@gradia.co.in?subject=Unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  switch (status) {
    case 'applied':
      return {
        subject: `Application received for ${jobTitle} at ${companyName}`,
        html: wrapper(`
          <p style="margin: 0 0 16px;">Dear ${candidateName},</p>
          <p style="margin: 0 0 16px;">Thank you for applying for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>. We have received your application.</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; margin: 24px 0;">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0 0 8px; font-weight: 600;">What happens next:</p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 4px;">Our team will review your application</li>
                  <li style="margin-bottom: 4px;">You will receive updates on your status</li>
                  <li style="margin-bottom: 4px;">If shortlisted, we will contact you for an interview</li>
                </ul>
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 24px; color: #6b7280;">We aim to review applications within 2-3 business days.</p>
          <p style="margin: 0;">Best regards,<br>The ${companyName} Hiring Team</p>
        `)
      };

    case 'shortlisted':
      return {
        subject: `You have been shortlisted for ${jobTitle} at ${companyName}`,
        html: wrapper(`
          <p style="margin: 0 0 16px;">Dear ${candidateName},</p>
          <p style="margin: 0 0 16px;">We are pleased to inform you that your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been shortlisted.</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; margin: 24px 0;">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0 0 8px; font-weight: 600;">Next steps:</p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 4px;">Your profile has impressed our hiring team</li>
                  <li style="margin-bottom: 4px;">You are moving forward in our selection process</li>
                  <li style="margin-bottom: 4px;">We will contact you soon with further details</li>
                </ul>
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 24px; color: #6b7280;">Please ensure your contact information is up to date.</p>
          <p style="margin: 0;">Best regards,<br>The ${companyName} Hiring Team</p>
        `)
      };

    case 'interview_scheduled':
      const interviewDate = additionalInfo?.interviewDate 
        ? new Date(additionalInfo.interviewDate).toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
          })
        : 'To be confirmed';
      
      return {
        subject: `Interview scheduled for ${jobTitle} at ${companyName}`,
        html: wrapper(`
          <p style="margin: 0 0 16px;">Dear ${candidateName},</p>
          <p style="margin: 0 0 16px;">Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been scheduled.</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; margin: 24px 0;">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0 0 8px;"><strong>Date and Time:</strong> ${interviewDate}</p>
                <p style="margin: 0 0 8px;"><strong>Type:</strong> ${additionalInfo?.interviewType || 'Video Call'}</p>
                ${additionalInfo?.meetingLink ? `<p style="margin: 0;"><strong>Meeting Link:</strong> <a href="${additionalInfo.meetingLink}" style="color: #2563eb;">${additionalInfo.meetingLink}</a></p>` : ''}
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 8px; font-weight: 600;">Preparation tips:</p>
          <ul style="margin: 0 0 24px; padding-left: 20px;">
            <li style="margin-bottom: 4px;">Test your audio and video before the call</li>
            <li style="margin-bottom: 4px;">Find a quiet, well-lit space</li>
            <li style="margin-bottom: 4px;">Have a copy of your resume ready</li>
          </ul>
          
          <p style="margin: 0;">Best of luck,<br>The ${companyName} Hiring Team</p>
        `)
      };

    case 'offer_received':
      return {
        subject: `Job offer for ${jobTitle} at ${companyName}`,
        html: wrapper(`
          <p style="margin: 0 0 16px;">Dear ${candidateName},</p>
          <p style="margin: 0 0 16px;">We are pleased to extend an offer for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; margin: 24px 0;">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0 0 8px;"><strong>Position:</strong> ${jobTitle}</p>
                ${additionalInfo?.salary ? `<p style="margin: 0 0 8px;"><strong>Compensation:</strong> ${additionalInfo.salary}</p>` : ''}
                ${additionalInfo?.startDate ? `<p style="margin: 0;"><strong>Start Date:</strong> ${additionalInfo.startDate}</p>` : ''}
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 24px; color: #6b7280;">Your detailed offer letter will be sent separately. Please review it carefully and let us know if you have any questions.</p>
          <p style="margin: 0;">Welcome to the team,<br>The ${companyName} Hiring Team</p>
        `)
      };

    case 'rejected':
      return {
        subject: `Application update for ${jobTitle} at ${companyName}`,
        html: wrapper(`
          <p style="margin: 0 0 16px;">Dear ${candidateName},</p>
          <p style="margin: 0 0 16px;">Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> and for taking the time to apply.</p>
          <p style="margin: 0 0 16px;">After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
          
          ${additionalInfo?.rejectionReason ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; margin: 24px 0;">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0;"><strong>Feedback:</strong> ${additionalInfo.rejectionReason}</p>
              </td>
            </tr>
          </table>
          ` : ''}
          
          <p style="margin: 0 0 24px; color: #6b7280;">We encourage you to apply for future positions that match your skills and experience.</p>
          <p style="margin: 0;">Best regards,<br>The ${companyName} Hiring Team</p>
        `)
      };

    case 'hired':
      return {
        subject: `Welcome to ${companyName}`,
        html: wrapper(`
          <p style="margin: 0 0 16px;">Dear ${candidateName},</p>
          <p style="margin: 0 0 16px;">We are delighted to confirm that you have officially joined <strong>${companyName}</strong> as our new <strong>${jobTitle}</strong>.</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; margin: 24px 0;">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0 0 8px; font-weight: 600;">Next steps:</p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 4px;">Complete your onboarding documentation</li>
                  <li style="margin-bottom: 4px;">Set up your work accounts and access</li>
                  <li style="margin-bottom: 4px;">Meet your team members</li>
                </ul>
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 24px; color: #6b7280;">We are thrilled to have you on board.</p>
          <p style="margin: 0;">See you soon,<br>The ${companyName} Team</p>
        `)
      };

    default:
      return {
        subject: `Application update for ${jobTitle}`,
        html: wrapper(`
          <p style="margin: 0 0 16px;">Dear ${candidateName},</p>
          <p style="margin: 0 0 16px;">There has been an update to your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
          <p style="margin: 0 0 24px; color: #6b7280;">Please log in to your account to view the details.</p>
          <p style="margin: 0;">Best regards,<br>The ${companyName} Hiring Team</p>
        `)
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidateId, jobId, status, additionalInfo }: StatusNotificationRequest = await req.json();

    console.log('Sending status notification:', { candidateId, jobId, status });

    // Fetch candidate details
    const { data: candidate, error: candidateError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidate not found');
    }

    // Fetch job and employer details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        job_title,
        employer:profiles!jobs_employer_id_fkey (
          company_name,
          full_name
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    const employer = job.employer as any;
    const companyName = employer?.company_name || employer?.full_name || 'Gradia';
    const emailContent = getEmailContent(
      status,
      candidate.full_name,
      job.job_title,
      companyName,
      additionalInfo
    );

    // Send email using REST API
    const emailResponse = await sendEmail(
      candidate.email,
      emailContent.subject,
      emailContent.html,
      `${companyName} Hiring`
    );

    console.log("Status notification email sent:", emailResponse);

    // Log the notification in a way that can be tracked
    console.log(`[STATUS_NOTIFICATION] Status: ${status}, Candidate: ${candidate.email}, Job: ${job.job_title}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: `${status} notification sent to ${candidate.email}` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending status notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);