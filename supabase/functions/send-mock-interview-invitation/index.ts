import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MockInterviewInvitationRequest {
  candidateEmail: string;
  candidateName: string;
  sessionId: string;
  stageOrder: number;
  stageName: string;
  stageDescription: string;
  appUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      candidateEmail, 
      candidateName, 
      sessionId, 
      stageOrder, 
      stageName, 
      stageDescription,
      appUrl 
    }: MockInterviewInvitationRequest = await req.json();

    console.log('Sending mock interview invitation:', { candidateEmail, stageName, stageOrder });

    const baseUrl = appUrl || 'https://gradia-link-shine.lovable.app';
    const interviewLink = `${baseUrl}/candidate/mock-interview/${sessionId}/${stageOrder}`;

    // Different email content based on stage
    const isStage1 = stageOrder === 1;
    const isDemoStage = stageOrder === 2;

    const stageEmoji = isDemoStage ? '🎬' : '📝';
    const stageTitle = isDemoStage ? 'Demo Teaching Session' : stageName;
    const buttonText = isDemoStage ? 'Start Demo Teaching →' : 'Start Interview →';

    const stageSpecificInfo = isDemoStage ? `
      <div class="info-box">
        <h3>🎬 Demo Teaching Details:</h3>
        <ul>
          <li><strong>Format:</strong> AI-Monitored Teaching Demonstration</li>
          <li><strong>Duration:</strong> 10-15 minutes teaching session</li>
          <li><strong>Recording:</strong> Your entire demo will be recorded for review</li>
          <li><strong>AI Evaluation:</strong> Our AI will analyze your teaching style, clarity, and engagement</li>
        </ul>
      </div>
      
      <p><strong>Tips for your demo teaching:</strong></p>
      <ul>
        <li>Choose a topic you're comfortable teaching</li>
        <li>Speak clearly and maintain eye contact with the camera</li>
        <li>Use examples and engage as if students are present</li>
        <li>Structure your lesson with introduction, main content, and summary</li>
        <li>Ensure good lighting and a clean background</li>
      </ul>
    ` : `
      <div class="info-box">
        <h3>📋 Interview Details:</h3>
        <ul>
          <li><strong>Stage:</strong> ${stageName} (Stage ${stageOrder} of 4)</li>
          <li><strong>Format:</strong> ${stageOrder === 1 ? '8 Questions' : stageOrder === 3 ? '5 Questions' : stageOrder === 4 ? '4 Questions' : '6 Questions'}</li>
          <li><strong>Time:</strong> ${stageOrder === 1 ? '150' : stageOrder === 3 ? '180' : '120'} seconds per question</li>
          <li><strong>Recording:</strong> Your responses will be video recorded</li>
        </ul>
      </div>
      
      <p><strong>Tips for success:</strong></p>
      <ul>
        <li>Find a quiet place with good internet connection</li>
        <li>Allow camera and microphone access when prompted</li>
        <li>Read each question carefully before answering</li>
        <li>Stay calm and confident!</li>
      </ul>
    `;

    const emailResponse = await resend.emails.send({
      from: "Gradia <noreply@gradia.co.in>",
      to: [candidateEmail],
      subject: `${stageEmoji} Your ${stageTitle} is Ready - Stage ${stageOrder}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .stage-badge { background: rgba(255,255,255,0.2); color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin-top: 10px; font-size: 14px; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; background: #0d9488; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .progress { display: flex; justify-content: center; gap: 10px; margin: 15px 0; }
            .progress-step { width: 30px; height: 30px; border-radius: 50%; background: ${stageOrder === 1 ? '#0d9488' : '#ccc'}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; }
            .progress-step.active { background: #0d9488; }
            .progress-step.completed { background: #22c55e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${stageEmoji} ${stageTitle}</h1>
              <div class="stage-badge">Stage ${stageOrder} of 4</div>
              <div class="progress">
                ${[1, 2, 3, 4].map(i => `<div class="progress-step ${i < stageOrder ? 'completed' : i === stageOrder ? 'active' : ''}">${i}</div>`).join('')}
              </div>
            </div>
            <div class="content">
              <h2>Hello ${candidateName}!</h2>
              <p>${stageOrder === 1 ? 'Your mock interview session is ready to begin!' : `Congratulations on completing Stage ${stageOrder - 1}! You're ready for the next stage.`}</p>
              
              <p><strong>Stage Description:</strong> ${stageDescription}</p>
              
              ${stageSpecificInfo}
              
              <center>
                <p>Click the button below to start:</p>
                <a href="${interviewLink}" class="button">${buttonText}</a>
              </center>
              
              <p><em>Note: This is for practice purposes. Your performance will be evaluated by AI to help you improve.</em></p>
            </div>
            <div class="footer">
              <p>Best of luck! 🍀</p>
              <p>The Gradia Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Mock interview invitation sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending mock interview invitation:", error);
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
