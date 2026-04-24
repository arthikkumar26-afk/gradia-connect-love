import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeErrorMessage } from "../_shared/safeError.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mirror of interviewPipelineConfig from src/data/interviewPipelineConfig.ts
// (edge functions are Deno — cannot import TS client files directly)
interface PipelineStage {
  order: number;
  name: string;
  description: string;
  isAutomated: boolean;
}

const commonStages: Record<string, PipelineStage> = {
  resumeScreening: { order: 1, name: 'CV/Resume', description: 'AI-powered resume analysis & scoring', isAutomated: true },
  writtenTestSlotBooking: { order: 2, name: 'Written Test Slot Booking', description: 'Candidate books Written Test slot', isAutomated: true },
  technicalAssessment: { order: 3, name: 'Written Test', description: '10 MCQ questions (90 sec each)', isAutomated: true },
  demoSlotBooking: { order: 4, name: 'Demo Slot Booking', description: 'Candidate books demo slot', isAutomated: true },
  demoRound: { order: 5, name: 'Demo Round', description: 'Live teaching/presentation demo', isAutomated: false },
  demoFeedback: { order: 6, name: 'Demo Feedback', description: 'Management review & feedback', isAutomated: false },
  hrRoundSlotBooking: { order: 7, name: 'HR Round Slot Booking', description: 'Candidate books HR round slot', isAutomated: true },
  hrRound: { order: 8, name: 'HR Round', description: 'HR interview & negotiation', isAutomated: false },
  finalReview: { order: 9, name: 'Final Review', description: 'Final evaluation & decision', isAutomated: true },
  offerStage: { order: 10, name: 'Offer Stage', description: 'Offer letter generation & sending', isAutomated: true },
};

const pipelineConfig: Record<string, Record<string, PipelineStage[]>> = {
  education: {
    principal: [
      commonStages.resumeScreening,
      { order: 2, name: 'Leadership Assessment', description: 'Leadership & management aptitude test', isAutomated: true },
      { order: 3, name: 'Case Study', description: 'School management case study analysis', isAutomated: false },
      commonStages.demoRound,
      commonStages.demoFeedback,
      { order: 6, name: 'Board Interview', description: 'Interview with school board/trustees', isAutomated: false },
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    vice_principal: [
      commonStages.resumeScreening,
      { order: 2, name: 'Academic Assessment', description: 'Academic planning & curriculum test', isAutomated: true },
      commonStages.demoSlotBooking,
      commonStages.demoRound,
      commonStages.demoFeedback,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    teacher: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.demoSlotBooking,
      commonStages.demoRound,
      commonStages.demoFeedback,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    lab_assistant: [
      commonStages.resumeScreening,
      { order: 2, name: 'Practical Assessment', description: 'Lab skills & safety test', isAutomated: true },
      commonStages.demoSlotBooking,
      commonStages.demoRound,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    librarian: [
      commonStages.resumeScreening,
      { order: 2, name: 'Knowledge Assessment', description: 'Library science & management test', isAutomated: true },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    counselor: [
      commonStages.resumeScreening,
      { order: 2, name: 'Psychometric Assessment', description: 'Counseling aptitude & scenario test', isAutomated: true },
      { order: 3, name: 'Role Play Round', description: 'Simulated counseling scenario', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
  },
  standard: {
    general: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    executive: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Aptitude Test', description: 'Logical & analytical reasoning', isAutomated: true },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    associate: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.offerStage,
    ],
  },
  it_corporate: {
    software_engineer: [
      commonStages.resumeScreening,
      { order: 2, name: 'Technical Coding Challenge', description: 'Online coding test (2 problems)', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      { order: 4, name: 'Technical MCQ Test', description: 'Role-specific MCQ test — 10 questions', isAutomated: true },
      { order: 5, name: 'Technical Interview', description: 'Role-specific technical discussion & system design', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    cybersecurity: [
      commonStages.resumeScreening,
      { order: 2, name: 'Security Assessment', description: 'Cybersecurity knowledge & threat analysis test', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    data_ai: [
      commonStages.resumeScreening,
      { order: 2, name: 'SQL & Analytics Test', description: 'SQL queries, data analysis & ML concepts', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    cloud_infrastructure: [
      commonStages.resumeScreening,
      { order: 2, name: 'Infrastructure Test', description: 'Cloud & CI/CD assessment', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    qa_testing: [
      commonStages.resumeScreening,
      { order: 2, name: 'QA Assessment', description: 'Testing methodologies & automation skills test', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    product_project_management: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Case Study', description: 'Product/project management case study', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    ui_ux_design: [
      commonStages.resumeScreening,
      { order: 2, name: 'Design Challenge', description: 'UI/UX design task & portfolio review', isAutomated: false },
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    business_it_consulting: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Strategy Presentation', description: 'IT consulting strategy & business analysis', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    it_support_operations: [
      commonStages.resumeScreening,
      { order: 2, name: 'Technical Support Test', description: 'IT support & troubleshooting assessment', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
  },
  sales: {
    sales_executive: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Sales Pitch', description: 'Product presentation & pitch', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    business_development: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Strategy Presentation', description: 'Market strategy & growth plan', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    account_manager: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Client Scenario', description: 'Client management simulation', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
  },
  management: {
    project_manager: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Case Study', description: 'Project management case study', isAutomated: false },
      { order: 5, name: 'Leadership Assessment', description: 'Leadership & team management', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    operations_manager: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Operations Case Study', description: 'Process optimization scenario', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    team_lead: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Team Scenario', description: 'Team conflict & management scenario', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
  },
  legal: {
    legal_advisor: [
      { order: 1, name: 'Instruction Mail', description: 'Send instruction email with guidelines & requirements', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      { order: 3, name: 'Written Test', description: 'Legal knowledge & case law assessment', isAutomated: true },
      { order: 4, name: 'Management Meet', description: 'Live meeting with management', isAutomated: false },
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    legal_officer: [
      { order: 1, name: 'Instruction Mail', description: 'Send instruction email with guidelines & requirements', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      { order: 3, name: 'Written Test', description: 'Legal compliance & regulatory assessment', isAutomated: true },
      { order: 4, name: 'Management Meet', description: 'Live meeting with management', isAutomated: false },
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    compliance_manager: [
      { order: 1, name: 'Instruction Mail', description: 'Send instruction email with guidelines & requirements', isAutomated: true },
      commonStages.writtenTestSlotBooking,
      { order: 3, name: 'Written Test', description: 'Compliance framework & risk assessment', isAutomated: true },
      { order: 4, name: 'Management Meet', description: 'Live meeting with management', isAutomated: false },
      commonStages.finalReview,
      commonStages.offerStage,
    ],
  },
  non_it_corporate: {
    hr_executive: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Group Discussion', description: 'Group discussion & communication assessment', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    finance_accounting: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      { order: 3, name: 'Aptitude & Accounting Test', description: 'Numerical aptitude & accounting knowledge', isAutomated: true },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    marketing_communications: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Campaign Presentation', description: 'Marketing strategy & campaign pitch', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    operations_logistics: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Operations Case Study', description: 'Supply chain & logistics scenario analysis', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    customer_service: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Role Play', description: 'Customer interaction & problem resolution simulation', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    procurement_supply: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    sales: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Sales Pitch', description: 'Product/service presentation & negotiation skills', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
    marketing: [
      commonStages.resumeScreening,
      commonStages.writtenTestSlotBooking,
      commonStages.technicalAssessment,
      { order: 4, name: 'Marketing Strategy Presentation', description: 'Brand strategy & campaign planning assessment', isAutomated: false },
      commonStages.hrRoundSlotBooking,
      commonStages.hrRound,
      commonStages.finalReview,
      commonStages.offerStage,
    ],
  },
};

// Emoji map for stages
const stageEmoji: Record<string, string> = {
  'CV/Resume': '📄',
  'Written Test Slot Booking': '📅',
  'Written Test': '💻',
  'Demo Slot Booking': '📅',
  'Demo Round': '🎥',
  'Demo Feedback': '📝',
  'HR Round Slot Booking': '📅',
  'HR Round': '👥',
  'Final Review': '🎯',
  'Offer Stage': '🎁',
  'Leadership Assessment': '🏆',
  'Case Study': '📊',
  'Board Interview': '🏛️',
  'Academic Assessment': '📚',
  'Practical Assessment': '🔬',
  'Knowledge Assessment': '📖',
  'Psychometric Assessment': '🧠',
  'Role Play Round': '🎭',
  'Aptitude Test': '🧩',
  'Technical Coding Challenge': '⌨️',
  'Technical MCQ Test': '📋',
  'Technical Interview': '💬',
  'Security Assessment': '🔐',
  'SQL & Analytics Test': '📈',
  'Infrastructure Test': '☁️',
  'QA Assessment': '✅',
  'Design Challenge': '🎨',
  'Strategy Presentation': '📊',
  'Technical Support Test': '🛠️',
  'Sales Pitch': '📢',
  'Client Scenario': '🤝',
  'Operations Case Study': '⚙️',
  'Team Scenario': '👫',
  'Instruction Mail': '📋',
  'Management Meet': '🤝',
  'Group Discussion': '💬',
  'Aptitude & Accounting Test': '🔢',
  'Campaign Presentation': '📣',
  'Role Play': '🎭',
  'Marketing Strategy Presentation': '📣',
  'Viva': '🎥',
};

function getStagesForJob(interviewType: string, functionType: string): PipelineStage[] {
  const typeConfig = pipelineConfig[interviewType];
  if (!typeConfig) return getDefaultStages();
  const stages = typeConfig[functionType];
  if (!stages || stages.length === 0) return getDefaultStages();
  return stages;
}

function getDefaultStages(): PipelineStage[] {
  return [
    commonStages.resumeScreening,
    commonStages.writtenTestSlotBooking,
    commonStages.technicalAssessment,
    commonStages.hrRoundSlotBooking,
    commonStages.hrRound,
    commonStages.finalReview,
    commonStages.offerStage,
  ];
}

function buildStagesHtml(stages: PipelineStage[]): string {
  // Step 1 is always "Interview Guidelines (You are here)"
  const rows = [
    `<tr>
      <td style="padding: 6px 0; font-size: 13px; color: #374151; border-bottom: 1px solid #dbeafe;">
        <strong>Step 1:</strong> 📋 Interview Guidelines <span style="color: #1d4ed8; font-style: italic;">(You are here)</span>
      </td>
    </tr>`
  ];

  stages.forEach((stage, idx) => {
    const emoji = stageEmoji[stage.name] || '📌';
    rows.push(`<tr>
      <td style="padding: 6px 0; font-size: 13px; color: #374151; ${idx < stages.length - 1 ? 'border-bottom: 1px solid #dbeafe;' : ''}">
        <strong>Step ${idx + 2}:</strong> ${emoji} ${stage.name} — <span style="color: #6b7280;">${stage.description}</span>
      </td>
    </tr>`);
  });

  return rows.join('');
}

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
    const baseUrl = "https://gradia-link-shine.lovable.app";
    const signupUrl = `${baseUrl}/candidate/signup`;

    // Determine pipeline stages dynamically
    const interviewType = job?.interview_type || '';
    const functionType = job?.function_type || '';
    const stages = getStagesForJob(interviewType, functionType);
    const stagesHtml = buildStagesHtml(stages);

    // Send instruction email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Gradia Hiring <noreply@gradia.co.in>',
        to: [candidate.email],
        reply_to: 'info@gradiaa.com',
        subject: `📋 Interview Instructions - ${job.job_title} at ${companyName}`,
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
          📋 Interview Instructions
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
        
        <p style="margin: 0 0 16px;">Congratulations on being shortlisted for the position of <strong style="color: #2563eb;">${job.job_title}</strong> at <strong>${companyName}</strong>! We are excited to begin your interview process.</p>
        
        <!-- Important: Create Account -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 24px 0; border: 1px solid #f59e0b;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #92400e;">⚠️ IMPORTANT: Create Your Gradia Account</p>
              <p style="margin: 0 0 12px; font-size: 13px; color: #78350f;">
                Before proceeding with the interview, please create your Gradia candidate account. This account is required for interview monitoring, tracking your progress, and receiving interview updates.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${signupUrl}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                      Create Gradia Account →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Interview Process Overview — Dynamic based on job pipeline -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; margin: 24px 0; border: 1px solid #2563eb;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Your Interview Journey</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${stagesHtml}
              </table>
            </td>
          </tr>
        </table>

        <!-- Preparation Tips -->
        <p style="margin: 24px 0 8px; font-weight: 600; color: #374151;">📌 Interview Preparation Tips:</p>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 8px;">Keep your updated resume ready (PDF format preferred)</li>
          <li style="margin-bottom: 8px;">Ensure stable internet connection for online assessments</li>
          <li style="margin-bottom: 8px;">Use a laptop/desktop with a working webcam and microphone</li>
          <li style="margin-bottom: 8px;">Choose a quiet, well-lit location for video rounds</li>
          <li style="margin-bottom: 8px;">Review the job description and required skills thoroughly</li>
          <li style="margin-bottom: 8px;">Be prepared with examples of your past projects and achievements</li>
          <li style="margin-bottom: 8px;">Keep your government ID proof handy for verification</li>
        </ul>

        <!-- Technical Requirements -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin: 16px 0;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-weight: 600; font-size: 13px; color: #374151;">🖥️ Technical Requirements:</p>
              <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #6b7280;">
                <li style="margin-bottom: 4px;">Google Chrome or Mozilla Firefox browser (latest version)</li>
                <li style="margin-bottom: 4px;">Webcam and microphone access permission</li>
                <li style="margin-bottom: 4px;">Screen sharing capability for assessments</li>
                <li style="margin-bottom: 4px;">Minimum internet speed: 2 Mbps</li>
              </ul>
            </td>
          </tr>
        </table>

        <!-- Job Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; margin: 24px 0; border: 1px solid #10b981;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Position Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 4px 0; font-size: 13px;">
                    <strong>Position:</strong> ${job.job_title}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px;">
                    <strong>Company:</strong> ${companyName}
                  </td>
                </tr>
                ${job.location ? `<tr><td style="padding: 4px 0; font-size: 13px;"><strong>Location:</strong> ${job.location}</td></tr>` : ''}
                ${job.job_type ? `<tr><td style="padding: 4px 0; font-size: 13px;"><strong>Type:</strong> ${job.job_type}</td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 8px; color: #374151;">
          You will receive further emails with specific instructions for each round as you progress through the interview stages.
        </p>
        
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
          <a href="mailto:info@gradiaa.com" style="color: #2563eb;">Contact Support</a> | 
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
    console.log('Instruction email sent:', emailResult);

    // Mark the Interview Guidelines stage as completed and create an event
    const { data: instructionStage } = await supabase
      .from('interview_stages')
      .select('id')
      .eq('name', 'Interview Guidelines')
      .single();

    const { data: resumeStage } = await supabase
      .from('interview_stages')
      .select('id')
      .eq('name', 'CV/Resume')
      .single();

    if (instructionStage) {
      await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidateId,
          stage_id: instructionStage.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: 'Instruction email sent to candidate',
        });

      // Advance current_stage_id to CV/Resume (stage 1) now that instruction email is sent
      if (resumeStage) {
        await supabase
          .from('interview_candidates')
          .update({ current_stage_id: resumeStage.id })
          .eq('id', interviewCandidateId);
      }
    }

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-instruction-email:", error);
    return new Response(
      JSON.stringify({ error: safeErrorMessage(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
