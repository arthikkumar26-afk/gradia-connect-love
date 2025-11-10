import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'stage_change' | 'comment_added' | 'document_uploaded' | 'offer_response';
  recipientEmail: string;
  recipientName: string;
  candidateName: string;
  jobTitle: string;
  companyName?: string;
  stage?: string;
  previousStage?: string;
  comment?: string;
  commentAuthor?: string;
  documentName?: string;
  offerAction?: 'accepted' | 'rejected' | 'deferred';
  deferredDate?: string;
}

const generateEmailContent = (data: NotificationRequest) => {
  const { type, recipientName, candidateName, jobTitle, companyName = "Gradia" } = data;

  switch (type) {
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
    const notificationData: NotificationRequest = await req.json();
    
    console.log('Sending email notification:', notificationData.type);

    const { subject, html } = generateEmailContent(notificationData);

    const emailResponse = await resend.emails.send({
      from: "Gradia Placements <onboarding@resend.dev>",
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
