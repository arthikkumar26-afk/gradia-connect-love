import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OfferLetterRequest {
  interviewCandidateId: string;
  salaryOffered: number;
  startDate: string;
  customContent?: string;
}

async function sendEmail(apiKey: string, params: { from: string; to: string[]; subject: string; html: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interviewCandidateId, salaryOffered, startDate, customContent }: OfferLetterRequest = await req.json();

    console.log('Generating offer letter for:', interviewCandidateId);

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

    // Generate offer letter content with AI
    const prompt = `Generate a professional offer letter for:

CANDIDATE: ${candidate.full_name}
POSITION: ${job.job_title}
COMPANY: ${companyName}
DEPARTMENT: ${job.department || 'Not specified'}
LOCATION: ${job.location || 'Not specified'}
SALARY: ₹${salaryOffered.toLocaleString('en-IN')} per annum
START DATE: ${new Date(startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${customContent ? `ADDITIONAL NOTES: ${customContent}` : ''}

Generate a warm, professional offer letter that:
1. Congratulates the candidate
2. Clearly states the position and compensation
3. Outlines the start date and any onboarding details
4. Expresses enthusiasm about them joining the team
5. Includes acceptance deadline (7 days from today)

Use the generate_letter function to return the content.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an HR professional creating offer letters.' },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_letter',
              description: 'Return the offer letter content',
              parameters: {
                type: 'object',
                properties: {
                  subject: { type: 'string', description: 'Email subject line' },
                  greeting: { type: 'string', description: 'Opening greeting' },
                  body: { type: 'string', description: 'Main letter content in HTML format' },
                  closing: { type: 'string', description: 'Closing remarks' },
                  acceptance_deadline: { type: 'string', description: 'Deadline to accept offer' }
                },
                required: ['subject', 'greeting', 'body', 'closing', 'acceptance_deadline'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_letter' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI letter generation failed');
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
    const letterContent = JSON.parse(toolCall.function.arguments);

    console.log('Offer letter generated:', letterContent.subject);

    // Save offer letter to database
    const { data: offerLetter, error: offerError } = await supabase
      .from('offer_letters')
      .insert({
        interview_candidate_id: interviewCandidateId,
        salary_offered: salaryOffered,
        currency: 'INR',
        position_title: job.job_title,
        start_date: startDate,
        offer_content: JSON.stringify(letterContent),
        status: 'draft',
        generated_by_ai: true
      })
      .select()
      .single();

    if (offerError) {
      console.error('Error saving offer letter:', offerError);
      throw offerError;
    }

    // Send email
    let emailSent = false;
    let emailError = null;
    
    try {
      const emailResponse = await sendEmail(RESEND_API_KEY, {
        from: `${companyName} HR <hr@gradia.co.in>`,
        to: [candidate.email],
        subject: letterContent.subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8; color: #333; }
              .container { max-width: 700px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px; border-radius: 10px 10px 0 0; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { background: white; padding: 40px; border: 1px solid #e5e7eb; }
              .highlight-box { background: #f0fdf4; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #10b981; }
              .details-grid { display: grid; gap: 15px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-label { color: #666; }
              .detail-value { font-weight: 600; color: #111; }
              .btn { display: inline-block; padding: 15px 40px; border-radius: 8px; text-decoration: none; margin: 10px 5px; font-weight: 600; }
              .btn-accept { background: #10b981; color: white; }
              .btn-decline { background: #f3f4f6; color: #666; }
              .footer { text-align: center; padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; }
              .deadline { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 25px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Congratulations!</h1>
                <p style="margin-bottom: 0; opacity: 0.9;">You've Been Selected</p>
              </div>
              <div class="content">
                <p>${letterContent.greeting}</p>
                
                ${letterContent.body}
                
                <div class="highlight-box">
                  <h3 style="margin-top: 0; color: #059669;">📋 Offer Details</h3>
                  <div class="details-grid">
                    <div class="detail-row">
                      <span class="detail-label">Position</span>
                      <span class="detail-value">${job.job_title}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Department</span>
                      <span class="detail-value">${job.department || 'To be assigned'}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Location</span>
                      <span class="detail-value">${job.location || 'To be confirmed'}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Annual Salary</span>
                      <span class="detail-value">₹${salaryOffered.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Start Date</span>
                      <span class="detail-value">${new Date(startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                
                <p>${letterContent.closing}</p>
                
                <div class="deadline">
                  <strong>⏰ Please respond by: ${letterContent.acceptance_deadline}</strong>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="#accept" class="btn btn-accept">✓ Accept Offer</a>
                  <a href="#decline" class="btn btn-decline">Decline</a>
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0;">We look forward to welcoming you to the team!</p>
                <p style="margin: 5px 0 0 0; color: #666;">${companyName} HR Team</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Email API response:", emailResponse);

      // Check if email was actually sent successfully
      if (emailResponse.statusCode === 403 || emailResponse.name === 'validation_error') {
        emailError = 'Domain not verified. To send emails to candidates, please verify your domain at resend.com/domains';
        console.error("Resend domain error:", emailResponse.message);
      } else if (emailResponse.id) {
        emailSent = true;
        console.log("Email sent successfully with ID:", emailResponse.id);
      } else if (emailResponse.error) {
        emailError = emailResponse.error.message || 'Email sending failed';
        console.error("Email error:", emailResponse.error);
      }
    } catch (err: any) {
      console.error("Email sending exception:", err);
      emailError = err.message;
    }

    // Update offer letter status based on email result
    await supabase
      .from('offer_letters')
      .update({ 
        status: emailSent ? 'sent' : 'draft',
        sent_at: emailSent ? new Date().toISOString() : null
      })
      .eq('id', offerLetter.id);

    // Update candidate status
    await supabase
      .from('interview_candidates')
      .update({ status: 'active' })
      .eq('id', interviewCandidateId);

    // Return response with email status
    if (!emailSent) {
      return new Response(JSON.stringify({
        success: false,
        offerLetterId: offerLetter.id,
        error: emailError || 'Email could not be sent. Please verify your domain at resend.com/domains to send emails to candidates.',
        offerSaved: true,
        message: 'Offer letter was saved but email was not sent. ' + (emailError || '')
      }), {
        status: 200, // Return 200 so frontend can show the specific error
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      offerLetterId: offerLetter.id,
      emailSent: true,
      candidateEmail: candidate.email
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error generating offer letter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
