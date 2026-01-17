import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManagementNotificationRequest {
  notificationType: 'slot_booking' | 'demo_feedback';
  candidateName: string;
  candidateEmail: string;
  sessionId?: string;
  bookingDetails?: {
    date: string;
    time: string;
    segment: string;
    category?: string;
    designation: string;
    location?: string;
    state?: string;
    district?: string;
  };
  appUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Management notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ManagementNotificationRequest = await req.json();
    console.log("Request data:", requestData);

    const {
      notificationType,
      candidateName,
      candidateEmail,
      sessionId,
      bookingDetails,
      appUrl
    } = requestData;

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get management team members based on notification type
    const notificationField = notificationType === 'slot_booking' 
      ? 'receives_slot_notifications' 
      : 'receives_demo_notifications';
    
    const { data: teamMembers, error: teamError } = await supabase
      .from('management_team')
      .select('*')
      .eq('is_active', true)
      .eq(notificationField, true);

    if (teamError) {
      console.error("Error fetching team members:", teamError);
      throw teamError;
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.log("No active team members found for this notification type");
      return new Response(
        JSON.stringify({ message: "No team members to notify", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${teamMembers.length} team members to notify`);

    const baseUrl = appUrl || "https://gradia-link-shine.lovable.app";
    let emailsSent = 0;
    let feedbackLinksCreated = 0;

    for (const member of teamMembers) {
      let subject = "";
      let htmlContent = "";

      if (notificationType === 'slot_booking') {
        // Slot booking notification
        subject = `🗓️ New Mock Interview Slot Booked - ${candidateName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .info-card { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
              .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
              .value { font-size: 16px; font-weight: 600; color: #1f2937; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">📅 New Slot Booking</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Mock Interview Assessment</p>
              </div>
              <div class="content">
                <p>Hello ${member.full_name},</p>
                <p>A candidate has booked a slot for their Technical Assessment:</p>
                
                <div class="info-card">
                  <div style="margin-bottom: 15px;">
                    <p class="label">Candidate</p>
                    <p class="value">${candidateName}</p>
                    <p style="color: #6b7280; font-size: 14px;">${candidateEmail}</p>
                  </div>
                  
                  ${bookingDetails ? `
                  <div style="margin-bottom: 15px;">
                    <p class="label">Date & Time</p>
                    <p class="value">${bookingDetails.date} at ${bookingDetails.time}</p>
                  </div>
                  
                  <div style="margin-bottom: 15px;">
                    <p class="label">Segment / Category</p>
                    <p class="value">${bookingDetails.segment} ${bookingDetails.category ? `/ ${bookingDetails.category}` : ''}</p>
                  </div>
                  
                  <div style="margin-bottom: 15px;">
                    <p class="label">Designation</p>
                    <p class="value">${bookingDetails.designation}</p>
                  </div>
                  
                  ${bookingDetails.state ? `
                  <div>
                    <p class="label">Location</p>
                    <p class="value">${bookingDetails.district || ''}, ${bookingDetails.state}</p>
                  </div>
                  ` : ''}
                  ` : ''}
                </div>
                
                <p>This is an automated notification. The candidate will receive their assessment invitation shortly.</p>
              </div>
              <div class="footer">
                <p>Gradia - Transforming Education Recruitment</p>
              </div>
            </div>
          </body>
          </html>
        `;
      } else if (notificationType === 'demo_feedback' && sessionId) {
        // Demo feedback request - create feedback token and link
        const feedbackToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        // Create management review record
        const { error: reviewError } = await supabase
          .from('management_reviews')
          .insert({
            session_id: sessionId,
            reviewer_id: member.id,
            reviewer_email: member.email,
            reviewer_name: member.full_name,
            feedback_token: feedbackToken,
            feedback_token_expires_at: expiresAt.toISOString(),
            status: 'pending',
            sent_at: new Date().toISOString()
          });

        if (reviewError) {
          console.error("Error creating review record:", reviewError);
          continue;
        }

        feedbackLinksCreated++;

        const feedbackLink = `${baseUrl}/admin/feedback?token=${feedbackToken}`;

        subject = `📝 Demo Feedback Request - ${candidateName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .info-card { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
              .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .button:hover { opacity: 0.9; }
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
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Demo Round Evaluation</p>
              </div>
              <div class="content">
                <p>Hello ${member.full_name},</p>
                <p>A candidate has completed their Demo Round and requires your feedback:</p>
                
                <div class="info-card">
                  <div style="margin-bottom: 15px;">
                    <p class="label">Candidate</p>
                    <p class="value">${candidateName}</p>
                    <p style="color: #6b7280; font-size: 14px;">${candidateEmail}</p>
                  </div>
                </div>

                <p>Please review their demo performance and provide your feedback using the button below:</p>
                
                <div style="text-align: center;">
                  <a href="${feedbackLink}" class="button">📝 Provide Feedback</a>
                </div>
                
                <div class="expire-note">
                  ⏰ This feedback link will expire on ${expiresAt.toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  If the button doesn't work, copy and paste this link:<br>
                  <span style="color: #3b82f6; word-break: break-all;">${feedbackLink}</span>
                </p>
              </div>
              <div class="footer">
                <p>Gradia - Transforming Education Recruitment</p>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      // Send email
      try {
        console.log(`Attempting to send email to ${member.email} with subject: ${subject}`);
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Gradia <onboarding@resend.dev>",
          to: [member.email],
          subject,
          html: htmlContent,
        });
        
        console.log("Resend response:", { emailData, emailError });

        if (emailError) {
          console.error(`Error sending email to ${member.email}:`, emailError);
        } else {
          emailsSent++;
          console.log(`Email sent to ${member.email}`);
        }
      } catch (emailErr) {
        console.error(`Error sending email to ${member.email}:`, emailErr);
      }
    }

    console.log(`Notification complete: ${emailsSent} emails sent, ${feedbackLinksCreated} feedback links created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        feedbackLinksCreated,
        totalRecipients: teamMembers.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in management notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
