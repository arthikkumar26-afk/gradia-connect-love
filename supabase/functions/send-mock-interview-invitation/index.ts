import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { safeErrorMessage } from "../_shared/safeError.ts";

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
  bookedSlot?: string;
  feedbackData?: {
    score: number;
    passed: boolean;
    feedback: string;
    strengths?: string[];
    improvements?: string[];
    questionScores?: Record<string, { score: number; feedback: string }>;
  };
  documentsUploaded?: string[];
}

const TOTAL_STAGES = 8;

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
      appUrl,
      bookedSlot,
      feedbackData,
      documentsUploaded
    }: MockInterviewInvitationRequest = await req.json();

    console.log('Sending mock interview invitation:', { candidateEmail, stageName, stageOrder });

    // Use provided appUrl, or determine from environment, or fallback to published URL
    const baseUrl = appUrl || Deno.env.get('APP_URL') || 'https://gradia-link-shine.lovable.app';
    
    // Determine interview link and content based on stage
    let interviewLink = '';
    let stageEmoji = '📝';
    let stageTitle = stageName;
    let buttonText = 'Continue →';
    let stageSpecificInfo = '';

    // Detect stage type from stageName (case-insensitive) for pipeline-agnostic emails
    const stageNameLower = (stageName || '').toLowerCase();
    const isInstructionStage = stageNameLower.includes('instruction') || stageNameLower.includes('guideline');
    const isSlotBookingStage = stageNameLower.includes('slot booking') || stageNameLower.includes('slot book');
    const isDemoStage = stageNameLower.includes('demo') && !stageNameLower.includes('feedback');
    const isFeedbackStage = stageNameLower.includes('feedback') || stageNameLower.includes('result');
    const isHRStage = stageNameLower.includes('hr') || stageNameLower.includes('document');
    const isReviewStage = stageNameLower.includes('review') || stageNameLower.includes('summary') || stageNameLower.includes('all review');
    const isCodingStage = stageNameLower.includes('coding');
    const isMCQStage = stageNameLower.includes('mcq') || stageNameLower.includes('technical assessment') || stageNameLower.includes('written test');

    if (isInstructionStage || stageOrder === 1) {
        stageEmoji = '📋';
        stageTitle = stageName || 'Interview Process Instructions';
        buttonText = ''; // No button for instructions
        interviewLink = ''; // No link needed
        buttonText = '';
        interviewLink = '';
        stageSpecificInfo = `
          <div class="info-box">
            <h3>📋 Welcome to the Interview Process!</h3>
            <p>This email contains important instructions for your upcoming interview stages.</p>
            <p>${stageDescription || ''}</p>
          </div>
          <p><strong>Important Guidelines:</strong></p>
          <ul>
            <li>Ensure you have a stable internet connection</li>
            <li>Use a quiet environment with good lighting</li>
            <li>Have your camera and microphone ready</li>
            <li>Keep your documents handy for the HR round</li>
          </ul>
          <p><strong>Next Step:</strong> You will receive another email shortly for the next stage.</p>
        `;
    } else if (isSlotBookingStage) {
        stageEmoji = '📅';
        stageTitle = stageName;
        buttonText = 'Book Your Slot →';
        interviewLink = `${baseUrl}/candidate/mock-interview/${sessionId}/${stageOrder}`;
        stageSpecificInfo = `
          <div class="info-box">
            <h3>📅 ${stageName}:</h3>
            <ul>
              <li><strong>Format:</strong> ${stageDescription || 'Schedule your interview slot'}</li>
              <li><strong>Choose:</strong> Select a time slot that works best for you</li>
            </ul>
          </div>
          <p><strong>Before booking:</strong></p>
          <ul>
            <li>Check your availability for the next few days</li>
            <li>Ensure you'll have a quiet space</li>
            <li>Prepare in advance</li>
          </ul>
        `;
    } else if (isCodingStage) {
        stageEmoji = '💻';
        stageTitle = stageName;
        buttonText = 'Start Coding Test →';
        interviewLink = `${baseUrl}/candidate/mock-interview/${sessionId}/${stageOrder}`;
        stageSpecificInfo = `
          <div class="info-box">
            <h3>💻 ${stageName}:</h3>
            <ul>
              <li><strong>Stage:</strong> ${stageName} (Stage ${stageOrder} of ${TOTAL_STAGES})</li>
              <li><strong>Description:</strong> ${stageDescription || 'Write code & submit solution'}</li>
              <li><strong>Recording:</strong> Your responses may be recorded</li>
            </ul>
          </div>
          <p><strong>Tips for success:</strong></p>
          <ul>
            <li>Find a quiet place with good internet connection</li>
            <li>Read each problem carefully before coding</li>
            <li>Test your solution before submitting</li>
            <li>Stay calm and focus on correctness</li>
          </ul>
        `;
    } else if (isMCQStage) {
        stageEmoji = '📝';
        stageTitle = stageName;
        buttonText = 'Start Assessment →';
        interviewLink = `${baseUrl}/candidate/mock-interview/${sessionId}/${stageOrder}`;
        stageSpecificInfo = `
          <div class="info-box">
            <h3>📝 ${stageName}:</h3>
            <ul>
              <li><strong>Stage:</strong> ${stageName} (Stage ${stageOrder} of ${TOTAL_STAGES})</li>
              <li><strong>Description:</strong> ${stageDescription || 'Answer technical questions'}</li>
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
    } else if (isDemoStage) {
        stageEmoji = '🎬';
        stageTitle = stageName;
        buttonText = 'Start Demo →';
        interviewLink = `${baseUrl}/candidate/demo-round?session=${sessionId}&stage=${stageOrder}`;
        stageSpecificInfo = `
          <div class="info-box">
            <h3>🎬 ${stageName}:</h3>
            <ul>
              <li><strong>Format:</strong> AI-Monitored Demonstration</li>
              <li><strong>Duration:</strong> 10-15 minutes</li>
              ${bookedSlot ? `<li><strong>Scheduled:</strong> ${bookedSlot}</li>` : ''}
              <li><strong>Description:</strong> ${stageDescription || ''}</li>
            </ul>
          </div>
          <p><strong>Tips for success:</strong></p>
          <ul>
            <li>Speak clearly and maintain eye contact with the camera</li>
            <li>Ensure good lighting and a clean background</li>
            <li>Structure your presentation clearly</li>
          </ul>
        `;
    } else if (isFeedbackStage) {
        stageEmoji = '📊';
        stageTitle = stageName;
        buttonText = 'View Dashboard →';
        interviewLink = `${baseUrl}/candidate/dashboard`;

        if (feedbackData) {
          const scoreColor = feedbackData.score >= 80 ? '#22c55e' : feedbackData.score >= 65 ? '#f59e0b' : '#ef4444';
          const criteriaLabels: Record<string, string> = {
            teachingClarity: 'Teaching Clarity',
            subjectKnowledge: 'Subject Knowledge',
            presentationSkills: 'Presentation Skills',
            timeManagement: 'Time Management',
            overallPotential: 'Overall Potential'
          };
          let criteriaHtml = '';
          if (feedbackData.questionScores) {
            criteriaHtml = Object.entries(feedbackData.questionScores).map(([key, value]) => {
              const scoreClr = value.score >= 80 ? '#22c55e' : value.score >= 65 ? '#f59e0b' : '#ef4444';
              return `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${criteriaLabels[key] || key}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;color:${scoreClr};font-weight:bold;">${value.score}%</td></tr>`;
            }).join('');
          }
          let strengthsHtml = '';
          if (feedbackData.strengths?.length) {
            strengthsHtml = `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;"><h4 style="color:#16a34a;margin:0 0 12px 0;">✓ Strengths</h4><ul style="margin:0;padding-left:20px;color:#166534;">${feedbackData.strengths.map(s => `<li style="margin-bottom:8px;">${s}</li>`).join('')}</ul></div>`;
          }
          let improvementsHtml = '';
          if (feedbackData.improvements?.length) {
            improvementsHtml = `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0;"><h4 style="color:#d97706;margin:0 0 12px 0;">⚡ Areas for Improvement</h4><ul style="margin:0;padding-left:20px;color:#92400e;">${feedbackData.improvements.map(i => `<li style="margin-bottom:8px;">${i}</li>`).join('')}</ul></div>`;
          }
          stageSpecificInfo = `
            <div style="background:linear-gradient(135deg,${scoreColor}20,${scoreColor}10);border:2px solid ${scoreColor};border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
              <h2 style="margin:0;font-size:14px;color:#6b7280;">Score</h2>
              <div style="font-size:48px;font-weight:bold;color:${scoreColor};margin:8px 0;">${feedbackData.score}%</div>
              <span style="background:${feedbackData.passed ? '#22c55e' : '#ef4444'};color:white;padding:4px 12px;border-radius:16px;font-size:12px;">${feedbackData.passed ? '✓ PASSED' : '✗ BELOW THRESHOLD'}</span>
            </div>
            ${criteriaHtml ? `<div style="margin:20px 0;"><h3 style="color:#374151;margin-bottom:12px;">📋 Criteria Breakdown</h3><table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;"><thead><tr style="background:#f3f4f6;"><th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;">Criteria</th><th style="padding:12px;text-align:center;border-bottom:2px solid #e5e7eb;">Score</th></tr></thead><tbody>${criteriaHtml}</tbody></table></div>` : ''}
            ${strengthsHtml}${improvementsHtml}
            ${feedbackData.feedback ? `<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;"><h4 style="color:#475569;margin:0 0 8px 0;">💡 AI Evaluation Summary</h4><p style="color:#64748b;margin:0;line-height:1.6;">${feedbackData.feedback}</p></div>` : ''}
          `;
        } else {
          stageSpecificInfo = `
            <div class="info-box">
              <h3>📊 ${stageName}:</h3>
              <ul>
                <li><strong>Description:</strong> ${stageDescription || 'View your performance feedback'}</li>
                <li><strong>Metrics:</strong> Detailed scores and analysis</li>
                <li><strong>Feedback:</strong> Personalized improvement suggestions</li>
              </ul>
            </div>
          `;
        }
    } else if (isHRStage) {
        stageEmoji = '📄';
        buttonText = 'View Dashboard →';
        interviewLink = `${baseUrl}/candidate/dashboard`;
        
        if (documentsUploaded?.length) {
          stageTitle = 'HR Documents Submitted Successfully';
          const docLabels: Record<string, string> = { idProof: 'ID Proof', educationCertificate: 'Education Certificate', addressProof: 'Address Proof', experienceLetter: 'Experience Letter' };
          stageSpecificInfo = `
            <div style="background:linear-gradient(135deg,#22c55e20,#22c55e10);border:2px solid #22c55e;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
              <div style="font-size:48px;margin-bottom:12px;">✅</div>
              <h2 style="margin:0;color:#16a34a;">Documents Submitted!</h2>
              <p style="color:#166534;margin-top:8px;">Your HR documents have been received and are under review.</p>
            </div>
            <div style="background:white;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb;">
              <h4 style="color:#374151;margin:0 0 12px 0;">📋 Documents Received:</h4>
              <ul style="margin:0;padding-left:20px;color:#4b5563;">${documentsUploaded.map(doc => `<li style="margin-bottom:8px;">✓ ${docLabels[doc] || doc}</li>`).join('')}</ul>
            </div>
          `;
        } else {
          stageTitle = stageName;
          stageSpecificInfo = `
            <div class="info-box">
              <h3>📄 ${stageName}:</h3>
              <ul>
                <li><strong>Stage:</strong> ${stageName} (Stage ${stageOrder} of ${TOTAL_STAGES})</li>
                <li><strong>Description:</strong> ${stageDescription || 'Submit required documents'}</li>
              </ul>
            </div>
            <p><strong>Documents to prepare:</strong></p>
            <ul>
              <li><strong>ID Proof</strong> (Required)</li>
              <li><strong>Education Certificate</strong> (Required)</li>
              <li><strong>Address Proof</strong> (Optional)</li>
              <li><strong>Experience Letter</strong> (Optional)</li>
            </ul>
          `;
        }
    } else if (isReviewStage) {
        stageEmoji = '✅';
        stageTitle = stageName;
        buttonText = 'View All Reviews →';
        interviewLink = `${baseUrl}/candidate/mock-interview/${sessionId}/${stageOrder}`;
        stageSpecificInfo = `
          <div class="info-box">
            <h3>✅ ${stageName}:</h3>
            <p>${stageDescription || 'View your comprehensive assessment across all stages.'}</p>
          </div>
        `;
    } else {
        // Generic fallback for any unrecognized stage
        interviewLink = `${baseUrl}/candidate/mock-interview/${sessionId}/${stageOrder}`;
        stageSpecificInfo = `
          <div class="info-box">
            <h3>${stageEmoji} ${stageName}:</h3>
            <p>${stageDescription || ''}</p>
          </div>
        `;
    }

    const emailResponse = await resend.emails.send({
      from: "Gradia <noreply@gradia.co.in>",
      to: [candidateEmail],
      subject: `${stageEmoji} ${stageTitle} - Stage ${stageOrder} of ${TOTAL_STAGES}`,
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
            .progress { display: flex; justify-content: center; gap: 5px; margin: 15px 0; flex-wrap: wrap; }
            .progress-step { width: 20px; height: 20px; border-radius: 50%; background: #ccc; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; }
            .progress-step.active { background: #0d9488; }
            .progress-step.completed { background: #22c55e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${stageEmoji} ${stageTitle}</h1>
              <div class="stage-badge">Stage ${stageOrder} of ${TOTAL_STAGES}</div>
              <div class="progress">
                ${Array.from({length: TOTAL_STAGES}, (_, i) => i + 1).map(i => `<div class="progress-step ${i < stageOrder ? 'completed' : i === stageOrder ? 'active' : ''}">${i}</div>`).join('')}
              </div>
            </div>
            <div class="content">
              <h2>Hello ${candidateName}!</h2>
              <p>${stageOrder === 1 ? 'Your interview journey begins now!' : `You're making great progress! Ready for Stage ${stageOrder}.`}</p>
              
              <p><strong>Stage Description:</strong> ${stageDescription}</p>
              
              ${stageSpecificInfo}
              
              ${buttonText ? `
              <center>
                <p>Click the button below to continue:</p>
                <a href="${interviewLink}" class="button">${buttonText}</a>
              </center>
              ` : ''}
              
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
      JSON.stringify({ error: safeErrorMessage(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
