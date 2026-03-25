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
      .select(`
        *,
        candidate:profiles(*),
        job:jobs(*, employer:profiles!jobs_employer_id_fkey(*)),
        current_stage:interview_stages(id, name, stage_order)
      `)
      .eq('id', interviewCandidateId)
      .single();

    if (candidateError || !interviewCandidate) {
      throw new Error(`Failed to fetch interview candidate: ${candidateError?.message || 'Not found'}`);
    }

    const candidate = interviewCandidate.candidate;
    const job = interviewCandidate.job;
    if (!candidate || !job) throw new Error('Candidate or job data missing');

    const candidateEmail = candidate.email || candidate.full_name;
    if (!candidateEmail) throw new Error('Candidate email not found');

    let analysisData = passedAnalysisData || interviewCandidate.ai_analysis || null;
    
    // Fallback: if no analysis data on interview_candidates, check resume_analyses table
    if (!analysisData || (!analysisData.overall_score && !interviewCandidate.ai_score)) {
      console.log('No analysis on interview_candidates, checking resume_analyses table...');
      const { data: resumeAnalysis } = await supabase
        .from('resume_analyses')
        .select('*')
        .eq('user_id', candidate.id)
        .maybeSingle();
      
      if (resumeAnalysis) {
        console.log('Found resume_analyses data, score:', resumeAnalysis.overall_score);
        analysisData = {
          overall_score: resumeAnalysis.overall_score,
          strengths: resumeAnalysis.strengths || [],
          summary: resumeAnalysis.experience_summary || 'Your resume has been reviewed by our AI system.',
          skill_highlights: resumeAnalysis.skill_highlights || [],
          career_level: resumeAnalysis.career_level,
          improvements: resumeAnalysis.improvements || [],
          skill_match_score: resumeAnalysis.overall_score, // approximate from overall
          experience_match_score: resumeAnalysis.overall_score,
          location_match_score: 50,
          recommendation: resumeAnalysis.overall_score >= 75 ? 'yes' : resumeAnalysis.overall_score >= 50 ? 'maybe' : 'no',
          suggested_focus: resumeAnalysis.improvements || [],
        };
        
        // Also update interview_candidates with this data so it's available elsewhere
        await supabase
          .from('interview_candidates')
          .update({ ai_score: resumeAnalysis.overall_score, ai_analysis: analysisData })
          .eq('id', interviewCandidateId);
        console.log('Updated interview_candidates with resume_analyses data');
      }
    }
    
    if (!analysisData) analysisData = {};
    
    const overallScore = analysisData.overall_score ?? interviewCandidate.ai_score ?? 0;
    const skillMatchScore = analysisData.skill_match_score ?? analysisData.skillMatchScore ?? 0;
    const experienceMatchScore = analysisData.experience_match_score ?? analysisData.experienceMatchScore ?? 0;
    const locationMatchScore = analysisData.location_match_score ?? analysisData.locationMatchScore ?? 0;
    const recommendation = analysisData.recommendation ?? 'maybe';
    const strengths = analysisData.strengths ?? [];
    const summary = analysisData.summary ?? 'Your resume has been reviewed by our AI system.';
    const suggestedFocus = analysisData.suggested_focus ?? analysisData.suggestedFocus ?? [];

    const companyName = job.employer?.company_name || job.employer?.full_name || 'the Company';

    const html = buildEmailHtml({
      candidateName: candidate.full_name || 'Candidate',
      jobTitle: job.job_title,
      companyName,
      overallScore,
      skillMatchScore,
      experienceMatchScore,
      locationMatchScore,
      recommendation,
      strengths,
      summary,
      suggestedFocus,
    });

    const emailResult = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Gradia <no-reply@gradia.co.in>',
        to: [candidateEmail],
        subject: `CV Analysis Results - ${job.job_title} at ${companyName}`,
        html,
      }),
    }).then(r => r.json());

    console.log('CV results email sent:', emailResult);

    // Advance to Written Test Slot Booking stage only if the candidate hasn't already moved beyond it
    const { data: nextStage } = await supabase
      .from('interview_stages')
      .select('id, stage_order')
      .eq('name', 'Written Test Slot Booking')
      .single();

    const currentStageOrder = interviewCandidate.current_stage?.stage_order ?? -1;
    const nextStageOrder = nextStage?.stage_order ?? -1;

    if (nextStage && currentStageOrder < nextStageOrder) {
      await supabase.from('interview_candidates')
        .update({ current_stage_id: nextStage.id })
        .eq('id', interviewCandidateId);
    } else {
      console.log('Skipping stage rollback after CV results email', {
        currentStage: interviewCandidate.current_stage?.name,
        currentStageOrder,
        nextStageOrder,
      });
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
