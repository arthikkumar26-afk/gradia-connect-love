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
      subject,
      html,
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
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
      .content { background: #ffffff; padding: 30px; }
      .info-card { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid; }
      .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; background: #f9fafb; border-radius: 0 0 12px 12px; }
      .button { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    </style>
  `;

  switch (status) {
    case 'applied':
      return {
        subject: `✅ Application Received: ${jobTitle} at ${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white;">
                <h1 style="margin: 0;">✅ Application Received!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Thank you for applying</p>
              </div>
              <div class="content">
                <p>Dear ${candidateName},</p>
                <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. We have received your application!</p>
                
                <div class="info-card" style="border-color: #6366f1;">
                  <h3 style="margin-top: 0; color: #6366f1;">📋 What Happens Next</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Our AI system will analyze your profile</li>
                    <li>Your skills will be matched with job requirements</li>
                    <li>You'll receive updates on your application status</li>
                    <li>If shortlisted, we'll contact you for an interview</li>
                  </ul>
                </div>
                
                <p style="color: #666;">Keep an eye on your inbox for updates. We aim to review applications within 2-3 business days.</p>
              </div>
              <div class="footer">
                <p>Best regards,<br><strong>The ${companyName} Hiring Team</strong></p>
                <p style="font-size: 12px; color: #999;">Powered by Gradia Job Portal</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'shortlisted':
      return {
        subject: `🌟 Great News! You've Been Shortlisted for ${jobTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                <h1 style="margin: 0;">🎉 Congratulations!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">You've been shortlisted!</p>
              </div>
              <div class="content">
                <p>Dear ${candidateName},</p>
                <p>We are excited to inform you that your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been <strong>shortlisted</strong>!</p>
                
                <div class="info-card" style="border-color: #10b981;">
                  <h3 style="margin-top: 0; color: #10b981;">📋 What This Means</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Your profile has impressed our hiring team</li>
                    <li>You're moving forward in our selection process</li>
                    <li>We'll be in touch soon with next steps</li>
                  </ul>
                </div>
                
                <p style="color: #666;">Please ensure your contact information is up to date and keep an eye on your inbox for further communication.</p>
              </div>
              <div class="footer">
                <p>Best regards,<br><strong>The ${companyName} Hiring Team</strong></p>
                <p style="font-size: 12px; color: #999;">Powered by Gradia Job Portal</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'interview_scheduled':
      const interviewDate = additionalInfo?.interviewDate 
        ? new Date(additionalInfo.interviewDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : 'To be confirmed';
      
      return {
        subject: `📅 Interview Scheduled: ${jobTitle} at ${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
                <h1 style="margin: 0;">📅 Interview Scheduled!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Get ready for your interview</p>
              </div>
              <div class="content">
                <p>Dear ${candidateName},</p>
                <p>Great news! Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been scheduled.</p>
                
                <div class="info-card" style="border-color: #3b82f6; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);">
                  <h3 style="margin-top: 0; color: #1d4ed8;">📋 Interview Details</h3>
                  <p><strong>📅 Date & Time:</strong> ${interviewDate}</p>
                  <p><strong>🎯 Type:</strong> ${additionalInfo?.interviewType || 'Video Call'}</p>
                  ${additionalInfo?.meetingLink ? `<p><strong>🔗 Meeting Link:</strong> <a href="${additionalInfo.meetingLink}" style="color: #3b82f6;">${additionalInfo.meetingLink}</a></p>` : ''}
                </div>
                
                <div class="info-card" style="border-color: #f59e0b; background: #fffbeb;">
                  <h3 style="margin-top: 0; color: #d97706;">💡 Tips for Success</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Test your audio and video before the call</li>
                    <li>Find a quiet, well-lit space</li>
                    <li>Have a copy of your resume ready</li>
                    <li>Prepare questions about the role and company</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>Best of luck!<br><strong>The ${companyName} Hiring Team</strong></p>
                <p style="font-size: 12px; color: #999;">Powered by Gradia Job Portal</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'offer_received':
      return {
        subject: `🎊 Job Offer: ${jobTitle} at ${companyName}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white;">
                <h1 style="margin: 0;">🎊 Congratulations!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">You've received a job offer!</p>
              </div>
              <div class="content">
                <p>Dear ${candidateName},</p>
                <p>We are thrilled to extend an offer for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>!</p>
                
                <div class="info-card" style="border-color: #8b5cf6; background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);">
                  <h3 style="margin-top: 0; color: #6d28d9;">📋 Offer Summary</h3>
                  <p><strong>💼 Position:</strong> ${jobTitle}</p>
                  ${additionalInfo?.salary ? `<p><strong>💰 Compensation:</strong> ${additionalInfo.salary}</p>` : ''}
                  ${additionalInfo?.startDate ? `<p><strong>📅 Start Date:</strong> ${additionalInfo.startDate}</p>` : ''}
                </div>
                
                <p>Your detailed offer letter will be sent separately. Please review it carefully and let us know if you have any questions.</p>
                
                <p style="color: #666; font-size: 14px;">We are excited about the possibility of you joining our team and look forward to your response!</p>
              </div>
              <div class="footer">
                <p>Welcome to the team!<br><strong>The ${companyName} Hiring Team</strong></p>
                <p style="font-size: 12px; color: #999;">Powered by Gradia Job Portal</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'rejected':
      return {
        subject: `Application Update: ${jobTitle} at ${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: #64748b; color: white;">
                <h1 style="margin: 0;">Application Update</h1>
              </div>
              <div class="content">
                <p>Dear ${candidateName},</p>
                <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> and for taking the time to apply.</p>
                
                <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
                
                ${additionalInfo?.rejectionReason ? `
                <div class="info-card" style="border-color: #94a3b8;">
                  <p style="margin: 0;"><strong>Feedback:</strong> ${additionalInfo.rejectionReason}</p>
                </div>
                ` : ''}
                
                <p>We encourage you to apply for future positions that match your skills and experience. We wish you the best in your job search and future endeavors.</p>
              </div>
              <div class="footer">
                <p>Best regards,<br><strong>The ${companyName} Hiring Team</strong></p>
                <p style="font-size: 12px; color: #999;">Powered by Gradia Job Portal</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'hired':
      return {
        subject: `🎉 Welcome to ${companyName}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                <h1 style="margin: 0;">🎉 Welcome Aboard!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">You're officially part of the team!</p>
              </div>
              <div class="content">
                <p>Dear ${candidateName},</p>
                <p>We are delighted to confirm that you have officially joined <strong>${companyName}</strong> as our new <strong>${jobTitle}</strong>!</p>
                
                <div class="info-card" style="border-color: #10b981; background: #ecfdf5;">
                  <h3 style="margin-top: 0; color: #059669;">🚀 Next Steps</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Complete your onboarding documentation</li>
                    <li>Set up your work accounts and access</li>
                    <li>Meet your team members</li>
                    <li>Review company policies and guidelines</li>
                  </ul>
                </div>
                
                <p>We're thrilled to have you on board and can't wait to see the amazing contributions you'll make!</p>
              </div>
              <div class="footer">
                <p>See you soon!<br><strong>The ${companyName} Team</strong></p>
                <p style="font-size: 12px; color: #999;">Powered by Gradia Job Portal</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    default:
      return {
        subject: `Application Update: ${jobTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: #6366f1; color: white;">
                <h1 style="margin: 0;">Application Update</h1>
              </div>
              <div class="content">
                <p>Dear ${candidateName},</p>
                <p>There has been an update to your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
                <p>Please log in to your account to view the details.</p>
              </div>
              <div class="footer">
                <p>Best regards,<br><strong>The ${companyName} Hiring Team</strong></p>
              </div>
            </div>
          </body>
          </html>
        `
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