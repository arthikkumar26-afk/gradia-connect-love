import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interviewCandidateId } = await req.json();

    if (!interviewCandidateId) {
      throw new Error('interviewCandidateId is required');
    }

    // Get candidate, job, and AI analysis details
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
    const aiAnalysis = interviewCandidate.ai_analysis as Record<string, any> || {};
    const aiScore = interviewCandidate.ai_score || 0;

    // Extract analysis details
    const overallScore = aiAnalysis.overall_score || aiScore;
    const skillMatchScore = aiAnalysis.skill_match_score || 0;
    const experienceMatchScore = aiAnalysis.experience_match_score || 0;
    const locationMatchScore = aiAnalysis.location_match_score || 0;
    const recommendation = aiAnalysis.recommendation || 'pending';
    const strengths: string[] = Array.isArray(aiAnalysis.strengths) ? aiAnalysis.strengths : [];
    const concerns: string[] = Array.isArray(aiAnalysis.concerns) ? aiAnalysis.concerns : [];
    const summary = aiAnalysis.summary || 'Your resume has been reviewed.';
    const suggestedFocus: string[] = Array.isArray(aiAnalysis.suggested_interview_focus) ? aiAnalysis.suggested_interview_focus : [];

    // Determine score color and label
    const getScoreColor = (score: number) => {
      if (score >= 75) return { bg: '#dcfce7', text: '#166534', border: '#22c55e', label: 'Excellent' };
      if (score >= 50) return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b', label: 'Good' };
      return { bg: '#fef2f2', text: '#991b1b', border: '#ef4444', label: 'Needs Improvement' };
    };

    const scoreStyle = getScoreColor(overallScore);

    const getRecommendationBadge = (rec: string) => {
      switch (rec) {
        case 'strong_yes': return { label: 'Strong Match', color: '#166534', bg: '#dcfce7' };
        case 'yes': return { label: 'Good Match', color: '#166534', bg: '#dcfce7' };
        case 'maybe': return { label: 'Moderate Match', color: '#92400e', bg: '#fef3c7' };
        case 'no': return { label: 'Low Match', color: '#991b1b', bg: '#fef2f2' };
        default: return { label: 'Under Review', color: '#374151', bg: '#f3f4f6' };
      }
    };

    const recBadge = getRecommendationBadge(recommendation);

    // Build strengths HTML
    const strengthsHtml = strengths.length > 0
      ? strengths.map(s => `<li style="margin-bottom: 6px; color: #166534; font-size: 13px;">✅ ${s}</li>`).join('')
      : '<li style="color: #6b7280; font-size: 13px;">No specific strengths identified yet</li>';

    // Build concerns/improvements HTML
    const concernsHtml = concerns.length > 0
      ? concerns.map(c => `<li style="margin-bottom: 6px; color: #991b1b; font-size: 13px;">⚠️ ${c}</li>`).join('')
      : '<li style="color: #6b7280; font-size: 13px;">No major concerns identified</li>';

    // Build focus areas HTML
    const focusHtml = suggestedFocus.length > 0
      ? suggestedFocus.map(f => `<li style="margin-bottom: 6px; color: #1d4ed8; font-size: 13px;">🎯 ${f}</li>`).join('')
      : '';

    // Build score bar helper
    const buildScoreBar = (label: string, score: number) => {
      const barColor = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
      return `
        <tr>
          <td style="padding: 6px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size: 12px; color: #374151; padding-bottom: 4px;">${label}: <strong>${score}%</strong></td>
              </tr>
              <tr>
                <td>
                  <div style="background-color: #e5e7eb; border-radius: 999px; height: 8px; width: 100%;">
                    <div style="background-color: ${barColor}; border-radius: 999px; height: 8px; width: ${score}%;"></div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    };

    // Send CV results email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} Hiring <noreply@gradia.co.in>`,
        to: [candidate.email],
        reply_to: 'support@gradia.co.in',
        subject: `📄 CV/Resume Analysis Results - ${job.job_title} at ${companyName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">
          📄 CV/Resume Analysis Report
        </h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">
          ${job.job_title} at ${companyName}
        </p>
      </td>
    </tr>
    
    <!-- Body -->
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear <strong>${candidate.full_name}</strong>,</p>
        
        <p style="margin: 0 0 16px;">Your CV/Resume has been analyzed by our AI-powered ATS system for the position of <strong style="color: #2563eb;">${job.job_title}</strong> at <strong>${companyName}</strong>. Here are your results:</p>
        
        <!-- Overall ATS Score -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${scoreStyle.bg}; border-radius: 12px; margin: 24px 0; border: 2px solid ${scoreStyle.border};">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: ${scoreStyle.text}; text-transform: uppercase; letter-spacing: 1px;">Your ATS Score</p>
              <p style="margin: 0; font-size: 48px; font-weight: 800; color: ${scoreStyle.text};">${overallScore}%</p>
              <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: ${scoreStyle.text};">${scoreStyle.label}</p>
              <span style="display: inline-block; margin-top: 8px; padding: 4px 16px; background-color: ${recBadge.bg}; color: ${recBadge.color}; border-radius: 999px; font-size: 12px; font-weight: 600;">
                ${recBadge.label}
              </span>
            </td>
          </tr>
        </table>

        <!-- Detailed Scores -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #374151;">📊 Detailed Breakdown</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${buildScoreBar('Skills Match', skillMatchScore)}
                ${buildScoreBar('Experience Match', experienceMatchScore)}
                ${buildScoreBar('Location Match', locationMatchScore)}
              </table>
            </td>
          </tr>
        </table>

        <!-- Summary -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; margin: 16px 0; border: 1px solid #2563eb;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1d4ed8;">💡 Summary</p>
              <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.6;">${summary}</p>
            </td>
          </tr>
        </table>

        <!-- Strengths -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 16px 0; border: 1px solid #22c55e;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #166534;">💪 Strengths</p>
              <ul style="margin: 0; padding-left: 18px;">
                ${strengthsHtml}
              </ul>
            </td>
          </tr>
        </table>

        <!-- Areas for Improvement -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; margin: 16px 0; border: 1px solid #ef4444;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #991b1b;">📝 Areas for Improvement</p>
              <ul style="margin: 0; padding-left: 18px;">
                ${concernsHtml}
              </ul>
            </td>
          </tr>
        </table>

        ${focusHtml ? `
        <!-- Interview Focus Areas -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3ff; border-radius: 8px; margin: 16px 0; border: 1px solid #7c3aed;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #5b21b6;">🎯 Prepare for These Areas in Interview</p>
              <ul style="margin: 0; padding-left: 18px;">
                ${focusHtml}
              </ul>
            </td>
          </tr>
        </table>
        ` : ''}

        <!-- Next Steps -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 24px 0; border: 1px solid #f59e0b;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #92400e;">📋 Next Steps</p>
              <p style="margin: 0; font-size: 13px; color: #78350f;">
                Your resume has been reviewed and you will be progressing to the next interview stage. Keep an eye on your email for further instructions regarding the <strong>Written Test</strong> round.
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 16px 0 0; color: #374151;">
          Best of luck!<br>
          <strong>The ${companyName} Hiring Team</strong>
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:support@gradia.co.in" style="color: #2563eb;">Contact Support</a> | 
          <a href="mailto:unsubscribe@gradia.co.in?subject=Unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@gradia.co.in>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    const emailResult = await emailResponse.json();
    console.log('CV results email sent:', emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-cv-results-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
