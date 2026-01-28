import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation
const MAX_NAME_LENGTH = 200;
const MAX_COMMENT_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return typeof email === 'string' && EMAIL_REGEX.test(email) && email.length <= 320;
}

function sanitizeInput(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  // Remove any HTML tags to prevent injection
  return input.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

interface NotificationRequest {
  type: 'stage_change' | 'comment_added' | 'document_uploaded' | 'offer_response' | 'stage_invitation' | 'hr_round_invitation';
  recipientEmail: string;
  recipientName: string;
  candidateName: string;
  jobTitle: string;
  companyName?: string;
  stage?: string;
  stageName?: string;
  previousStage?: string;
  comment?: string;
  commentAuthor?: string;
  documentName?: string;
  offerAction?: 'accepted' | 'rejected' | 'deferred';
  deferredDate?: string;
  interviewCandidateId?: string;
  stageId?: string;
  meetingLink?: string;
  scheduledDate?: string;
}

const generateEmailContent = (data: NotificationRequest) => {
  const { type, recipientName, candidateName, jobTitle, companyName = "Gradia" } = data;

  switch (type) {
    case 'hr_round_invitation':
      const meetingTime = data.scheduledDate 
        ? new Date(data.scheduledDate).toLocaleString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          })
        : 'To be confirmed';
      
      return {
        subject: `HR Round Scheduled: ${jobTitle} at ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">HR Round Interview Scheduled</h2>
            <p>Dear ${recipientName || candidateName},</p>
            <p>Your HR Round interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> has been scheduled.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>📅 Date & Time:</strong> ${meetingTime}</p>
              <p style="margin: 0 0 10px 0;"><strong>💼 Position:</strong> ${jobTitle}</p>
              <p style="margin: 0;"><strong>🏢 Company:</strong> ${companyName}</p>
            </div>
            
            ${data.meetingLink ? `
              <p>Please join the meeting using the link below at the scheduled time:</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${data.meetingLink}" 
                   style="background-color: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Join Meeting
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${data.meetingLink}">${data.meetingLink}</a></p>
            ` : ''}
            
            <p><strong>Tips for your HR Round:</strong></p>
            <ul style="color: #555;">
              <li>Join 5 minutes before the scheduled time</li>
              <li>Ensure you have a stable internet connection</li>
              <li>Be prepared to discuss your experience and expectations</li>
              <li>Have questions ready about the role and company</li>
            </ul>
            
            <p>If you need to reschedule, please contact us as soon as possible.</p>
            <br>
            <p>Best regards,<br>${companyName} Recruitment Team</p>
          </div>
        `,
      };

    case 'stage_invitation':
      const stageName = data.stageName || data.stage || 'Interview';
      const baseUrl = "https://gradia-link-shine.lovable.app";
      
      // Generate direct interview link based on stage
      let interviewLink = `${baseUrl}/candidate/dashboard`;
      let buttonText = "Go to Dashboard";
      
      if (data.interviewCandidateId && data.stageId) {
        if (stageName === "AI Technical Interview" || stageName.toLowerCase().includes("ai")) {
          interviewLink = `${baseUrl}/interview?candidateId=${data.interviewCandidateId}&stageId=${data.stageId}&type=ai-technical`;
          buttonText = "Start AI Interview";
        } else if (stageName === "Technical Assessment") {
          interviewLink = `${baseUrl}/interview?candidateId=${data.interviewCandidateId}&stageId=${data.stageId}&type=technical`;
          buttonText = "Start Technical Assessment";
        } else {
          interviewLink = `${baseUrl}/interview?candidateId=${data.interviewCandidateId}&stageId=${data.stageId}&type=general`;
          buttonText = "Start Interview";
        }
      }
      
      return {
        subject: `Interview Invitation: ${stageName} - ${jobTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Interview Stage Invitation</h2>
            <p>Hi ${recipientName || candidateName},</p>
            <p>You are invited to proceed with the <strong>${stageName}</strong> stage for the <strong>${jobTitle}</strong> position.</p>
            <p>Click the button below to start your interview directly:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${interviewLink}" 
                 style="background-color: #7C3AED; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                ${buttonText}
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${interviewLink}">${interviewLink}</a></p>
            <p>If you have any questions, please don't hesitate to reach out.</p>
            <br>
            <p>Best regards,<br>${companyName} Team</p>
          </div>
        `,
      };

    case 'stage_change':
      return {
        subject: `Placement Update: ${candidateName} - ${jobTitle}`,
        html: `
          <h2>Placement Stage Update</h2>
          <p>Hi ${recipientName},</p>
          <p>The placement for <strong>${candidateName}</strong> applying for <strong>${jobTitle}</strong> has been updated.</p>
          <p><strong>Previous Stage:</strong> ${data.previousStage}</p>
          <p><strong>Current Stage:</strong> ${data.stage}</p>
          <p>Please log in to the dashboard to view more details.</p>
          <br>
          <p>Best regards,<br>${companyName} Team</p>
        `,
      };

    case 'comment_added':
      return {
        subject: `New Comment: ${candidateName} - ${jobTitle}`,
        html: `
          <h2>New Comment Added</h2>
          <p>Hi ${recipientName},</p>
          <p><strong>${data.commentAuthor}</strong> added a comment on the placement for <strong>${candidateName}</strong> (${jobTitle}):</p>
          <blockquote style="background: #f4f4f4; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
            ${data.comment}
          </blockquote>
          <p>Please log in to the dashboard to respond or view more details.</p>
          <br>
          <p>Best regards,<br>${companyName} Team</p>
        `,
      };

    case 'document_uploaded':
      return {
        subject: `Document Uploaded: ${candidateName} - ${jobTitle}`,
        html: `
          <h2>New Document Uploaded</h2>
          <p>Hi ${recipientName},</p>
          <p><strong>${candidateName}</strong> has uploaded a new document for the <strong>${jobTitle}</strong> position:</p>
          <p><strong>Document:</strong> ${data.documentName}</p>
          <p>Please log in to the dashboard to review and verify the document.</p>
          <br>
          <p>Best regards,<br>${companyName} Team</p>
        `,
      };

    case 'offer_response':
      const actionText = data.offerAction === 'accepted' 
        ? 'accepted' 
        : data.offerAction === 'deferred' 
        ? 'requested to defer' 
        : 'declined';
      
      return {
        subject: `Offer ${actionText}: ${candidateName} - ${jobTitle}`,
        html: `
          <h2>Offer Letter Response</h2>
          <p>Hi ${recipientName},</p>
          <p><strong>${candidateName}</strong> has ${actionText} the offer letter for the <strong>${jobTitle}</strong> position.</p>
          ${data.offerAction === 'deferred' ? `<p><strong>Requested Joining Date:</strong> ${data.deferredDate}</p>` : ''}
          <p>Please log in to the dashboard to proceed with the next steps.</p>
          <br>
          <p>Best regards,<br>${companyName} Team</p>
        `,
      };

    default:
      return {
        subject: `Update: ${candidateName} - ${jobTitle}`,
        html: `
          <h2>Placement Update</h2>
          <p>Hi ${recipientName},</p>
          <p>There has been an update on the placement for <strong>${candidateName}</strong> (${jobTitle}).</p>
          <p>Please log in to the dashboard to view more details.</p>
          <br>
          <p>Best regards,<br>${companyName} Team</p>
        `,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - support both user tokens and service role calls
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      // Try to validate the token - but don't fail if it's a service call
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (!userError && user) {
          userId = user.id;
          console.log("Authenticated user for notification:", userId);
        }
      } catch (authErr) {
        // Token validation failed - might be a service-to-service call
        console.log("Token validation skipped - proceeding as service call");
      }
    }
    
    // Log the request source
    console.log("Processing notification email request, authenticated:", !!userId);

    const rawData = await req.json();

    // Support both 'to' and 'recipientEmail' field names
    const recipientEmail = rawData.recipientEmail || rawData.to;
    if (!isValidEmail(recipientEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid recipient email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validTypes = ['stage_change', 'comment_added', 'document_uploaded', 'offer_response', 'stage_invitation', 'hr_round_invitation'];
    if (!validTypes.includes(rawData.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationData: NotificationRequest = {
      type: rawData.type,
      recipientEmail: recipientEmail,
      recipientName: sanitizeInput(rawData.recipientName || rawData.candidateName, MAX_NAME_LENGTH),
      candidateName: sanitizeInput(rawData.candidateName, MAX_NAME_LENGTH),
      jobTitle: sanitizeInput(rawData.jobTitle, MAX_NAME_LENGTH),
      companyName: sanitizeInput(rawData.companyName, MAX_NAME_LENGTH) || "Gradia",
      stage: sanitizeInput(rawData.stage, 100),
      stageName: sanitizeInput(rawData.stageName, 100),
      previousStage: sanitizeInput(rawData.previousStage, 100),
      comment: sanitizeInput(rawData.comment, MAX_COMMENT_LENGTH),
      commentAuthor: sanitizeInput(rawData.commentAuthor, MAX_NAME_LENGTH),
      documentName: sanitizeInput(rawData.documentName, MAX_NAME_LENGTH),
      offerAction: ['accepted', 'rejected', 'deferred'].includes(rawData.offerAction) ? rawData.offerAction : undefined,
      deferredDate: sanitizeInput(rawData.deferredDate, 20),
      interviewCandidateId: sanitizeInput(rawData.interviewCandidateId, 100),
      stageId: sanitizeInput(rawData.stageId, 100),
      meetingLink: sanitizeInput(rawData.meetingLink, 500),
      scheduledDate: sanitizeInput(rawData.scheduledDate, 50),
    };
    
    console.log('Sending email notification:', notificationData.type, 'for user:', userId);

    const { subject, html } = generateEmailContent(notificationData);

    const emailResponse = await resend.emails.send({
      from: "Gradia Placements <notifications@gradia.co.in>",
      to: [notificationData.recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
