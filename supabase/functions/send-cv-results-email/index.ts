import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getScoreStyle(score: number) {
  if (score >= 75) return { bg: '#dcfce7', text: '#166534', border: '#22c55e', label: 'Excellent' };
  if (score >= 50) return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b', label: 'Good' };
  return { bg: '#fef2f2', text: '#991b1b', border: '#ef4444', label: 'Needs Improvement' };
}

function getRecBadge(rec: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    strong_yes: { label: 'Strong Match', color: '#166534', bg: '#dcfce7' },
    yes: { label: 'Good Match', color: '#166534', bg: '#dcfce7' },
    maybe: { label: 'Moderate Match', color: '#92400e', bg: '#fef3c7' },
    no: { label: 'Low Match', color: '#991b1b', bg: '#fef2f2' },
  };
  return map[rec] || { label: 'Under Review', color: '#374151', bg: '#f3f4f6' };
}

function scoreBar(label: string, score: number) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return `<p style="margin:4px 0;font-size:12px;color:#374151;">${label}: <strong>${score}%</strong></p>
<div style="background:#e5e7eb;border-radius:999px;height:8px;width:100%;margin-bottom:8px;">
  <div style="background:${color};border-radius:999px;height:8px;width:${score}%;"></div>
</div>`;
}

function buildEmailHtml(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  overallScore: number;
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
  recommendation: string;
  strengths: string[];
  summary: string;
  suggestedFocus: string[];
}) {
  const ss = getScoreStyle(params.overallScore);
  const rb = getRecBadge(params.recommendation);
  const strengthsHtml = params.strengths.length > 0
    ? params.strengths.map(s => `<li style="margin-bottom:6px;color:#166534;font-size:13px;">✅ ${s}</li>`).join('')
    : '<li style="color:#6b7280;font-size:13px;">No specific strengths identified yet</li>';
  const focusHtml = params.suggestedFocus.length > 0
    ? `<div style="background:#f5f3ff;border-radius:8px;margin:16px 0;border:1px solid #7c3aed;padding:16px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#5b21b6;">🎯 Prepare for These Areas</p>
        <ul style="margin:0;padding-left:18px;">${params.suggestedFocus.map(f => `<li style="margin-bottom:6px;color:#1d4ed8;font-size:13px;">🎯 ${f}</li>`).join('')}</ul>
      </div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;margin:0;padding:0;background:#f9fafb;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr><td style="padding:32px 24px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:8px 8px 0 0;text-align:center;">
  <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">📄 CV/Resume Analysis Report</h1>
  <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">${params.jobTitle} at ${params.companyName}</p>
</td></tr>
<tr><td style="padding:24px;">
  <p style="margin:0 0 16px;">Dear <strong>${params.candidateName}</strong>,</p>
  <p style="margin:0 0 16px;">Your CV has been analyzed by our AI-powered ATS for <strong style="color:#2563eb;">${params.jobTitle}</strong> at <strong>${params.companyName}</strong>.</p>
  <div style="background:${ss.bg};border-radius:12px;margin:24px 0;border:2px solid ${ss.border};padding:24px;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${ss.text};text-transform:uppercase;letter-spacing:1px;">Your ATS Score</p>
    <p style="margin:0;font-size:48px;font-weight:800;color:${ss.text};">${params.overallScore}%</p>
    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${ss.text};">${ss.label}</p>
    <span style="display:inline-block;margin-top:8px;padding:4px 16px;background:${rb.bg};color:${rb.color};border-radius:999px;font-size:12px;font-weight:600;">${rb.label}</span>
  </div>
  <div style="background:#f9fafb;border-radius:8px;margin:16px 0;border:1px solid #e5e7eb;padding:16px;">
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;">📊 Detailed Breakdown</p>
    ${scoreBar('Skills Match', params.skillMatchScore)}
    ${scoreBar('Experience Match', params.experienceMatchScore)}
    ${scoreBar('Location Match', params.locationMatchScore)}
  </div>
  <div style="background:#eff6ff;border-radius:8px;margin:16px 0;border:1px solid #2563eb;padding:16px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1d4ed8;">💡 Summary</p>
    <p style="margin:0;font-size:13px;color:#374151;">${params.summary}</p>
  </div>
  <div style="background:#f0fdf4;border-radius:8px;margin:16px 0;border:1px solid #22c55e;padding:16px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#166534;">💪 Strengths</p>
    <ul style="margin:0;padding-left:18px;">${strengthsHtml}</ul>
  </div>
  ${focusHtml}
  <div style="background:#fef3c7;border-radius:8px;margin:24px 0;border:1px solid #f59e0b;padding:16px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">📋 Next Steps</p>
    <p style="margin:0;font-size:13px;color:#78350f;">Your resume has been reviewed. Watch for further instructions about the <strong>Written Test</strong> round.</p>
  </div>
  <p style="margin:16px 0 0;color:#374151;">Best of luck!<br><strong>The ${params.companyName} Hiring Team</strong></p>
</td></tr>
<tr><td style="padding:24px;background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
    Sent by Gradia Job Portal on behalf of ${params.companyName}.<br>
    <a href="mailto:support@gradia.co.in" style="color:#2563eb;">Contact Support</a>
  </p>
</td></tr>
</table></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { interviewCandidateId, analysisData: passedAnalysisData } = await req.json();
    if (!interviewCandidateId) throw new Error('interviewCandidateId is required');

    const { data: interviewCandidate, error: candidateError } = await supabase
      .from('interview_candidates')
      .select('*, candidate:profiles(*), job:jobs(*, employer:profiles!jobs_employer_id_fkey(*))')
      .eq('id', interviewCandidateId)
      .single();

    if (candidateError || !interviewCandidate) throw new Error('Interview candidate not found');

    const candidate = interviewCandidate.candidate;
    const job = interviewCandidate.job;
    const companyName = job?.employer?.company_name || 'Gradia';

    // Resolve AI analysis from multiple sources
    let aiAnalysis: Record<string, any> = {};
    let aiScore = 0;

    if (passedAnalysisData?.overall_score) {
      aiAnalysis = passedAnalysisData;
      aiScore = passedAnalysisData.overall_score;
    } else {
      const { data: cvStageId } = await supabase
        .from('interview_stages').select('id').eq('name', 'CV/Resume').single();

      if (cvStageId) {
        const { data: cvEvent } = await supabase
          .from('interview_events')
          .select('ai_feedback, ai_score')
          .eq('interview_candidate_id', interviewCandidateId)
          .eq('stage_id', cvStageId.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const fb = (cvEvent?.ai_feedback as Record<string, any>) || {};
        if (fb.overall_score) { aiAnalysis = fb; aiScore = fb.overall_score; }
        else if (cvEvent?.ai_score) { aiScore = cvEvent.ai_score; }
      }

      if (!aiAnalysis.overall_score) {
        const ca = (interviewCandidate.ai_analysis as Record<string, any>) || {};
        if (ca.overall_score) { aiAnalysis = ca; aiScore = ca.overall_score; }
        else if (interviewCandidate.ai_score) { aiScore = interviewCandidate.ai_score; }
      }
    }

    const overallScore = aiAnalysis.overall_score || aiScore;

    const html = buildEmailHtml({
      candidateName: candidate.full_name,
      jobTitle: job.job_title,
      companyName,
      overallScore,
      skillMatchScore: aiAnalysis.skill_match_score || 0,
      experienceMatchScore: aiAnalysis.experience_match_score || 0,
      locationMatchScore: aiAnalysis.location_match_score || 0,
      recommendation: aiAnalysis.recommendation || 'pending',
      strengths: Array.isArray(aiAnalysis.strengths) ? aiAnalysis.strengths : [],
      summary: aiAnalysis.summary || 'Your resume has been reviewed.',
      suggestedFocus: Array.isArray(aiAnalysis.suggested_interview_focus) ? aiAnalysis.suggested_interview_focus : [],
    });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${companyName} Hiring <noreply@gradia.co.in>`,
        to: [candidate.email],
        reply_to: 'support@gradia.co.in',
        subject: `📄 CV/Resume Analysis Results - ${job.job_title} at ${companyName}`,
        html,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log('CV results email sent:', emailResult);

    // Mark CV/Resume stage as completed
    const { data: cvStage } = await supabase
      .from('interview_stages').select('id').eq('name', 'CV/Resume').single();

    if (cvStage) {
      await supabase.from('interview_events').upsert({
        interview_candidate_id: interviewCandidateId,
        stage_id: cvStage.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: 'CV/Resume ATS analysis email sent',
        ai_score: overallScore || null,
        ai_feedback: Object.keys(aiAnalysis).length > 0 ? aiAnalysis : null,
      }, { onConflict: 'interview_candidate_id,stage_id', ignoreDuplicates: false });
    }

    // Advance to Written Test Slot Booking stage
    const { data: nextStage } = await supabase
      .from('interview_stages').select('id').eq('name', 'Written Test Slot Booking').single();

    if (nextStage) {
      await supabase.from('interview_candidates')
        .update({ current_stage_id: nextStage.id })
        .eq('id', interviewCandidateId);
    }

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-cv-results-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
