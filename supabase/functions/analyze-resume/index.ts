import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResumeAnalysisRequest {
  candidateId: string;
  jobId: string;
  resumeUrl?: string;
  candidateProfile: {
    full_name: string;
    email: string;
    experience_level?: string;
    preferred_role?: string;
    location?: string;
    skills?: string[];
    education?: string;
    mobile?: string;
  };
  jobDetails: {
    job_title: string;
    description?: string;
    requirements?: string;
    skills?: string[];
    experience_required?: string;
    location?: string;
  };
}

async function sendInterviewInvitationEmail(apiKey: string, params: {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  stageName: string;
  aiScore: number;
  recommendation: string;
}) {
  console.log('Sending interview invitation email to:', params.candidateEmail);
  
  const emailPayload = {
    from: 'Gradia Hiring <noreply@gradia.co.in>',
    to: [params.candidateEmail],
    reply_to: 'support@gradia.co.in',
    subject: `Your application for ${params.jobTitle} has been reviewed`,
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@gradia.co.in>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; border-bottom: 1px solid #e5e7eb;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">Application Update</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px;">Dear ${params.candidateName},</p>
        
        <p style="margin: 0 0 16px;">Thank you for applying for the <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>. Your application has been reviewed by our team.</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 6px; margin: 24px 0;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Application Details</p>
              <p style="margin: 0 0 8px;"><strong>Position:</strong> ${params.jobTitle}</p>
              <p style="margin: 0 0 8px;"><strong>Company:</strong> ${params.companyName}</p>
              <p style="margin: 0 0 8px;"><strong>Current Stage:</strong> ${params.stageName}</p>
              <p style="margin: 0;"><strong>Match Score:</strong> ${params.aiScore}%</p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 16px;"><strong>Next Steps:</strong></p>
        <ol style="margin: 0 0 24px; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Our hiring team will conduct a detailed review</li>
          <li style="margin-bottom: 8px;">If shortlisted, you will receive an interview invitation</li>
          <li style="margin-bottom: 8px;">Please check your inbox regularly for updates</li>
        </ol>
        
        <p style="margin: 0 0 24px; color: #6b7280;">If you have any questions, please reply to this email.</p>
        
        <p style="margin: 0;">Best regards,<br>The ${params.companyName} Hiring Team</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Gradia Job Portal on behalf of ${params.companyName}.<br>
          <a href="mailto:unsubscribe@gradia.co.in?subject=Unsubscribe" style="color: #9ca3af;">Unsubscribe</a> from these notifications.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
  
  console.log('Sending email with payload:', JSON.stringify({ from: emailPayload.from, to: emailPayload.to, subject: emailPayload.subject }));
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    console.error('Resend API error:', response.status, JSON.stringify(result));
    return { error: result };
  }
  
  console.log('Email sent successfully! ID:', result.id);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured - email notifications will be skipped');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidateId: originalCandidateId, jobId, resumeUrl, candidateProfile, jobDetails }: ResumeAnalysisRequest = await req.json();

    console.log('Analyzing resume for candidate ID:', originalCandidateId, 'job:', jobId);
    console.log('Candidate details from resume:', {
      name: candidateProfile.full_name,
      email: candidateProfile.email,
      skills: candidateProfile.skills?.length || 0,
      experience: candidateProfile.experience_level
    });

    // Check if a profile with this email already exists (for existing auth users)
    let actualCandidateId = originalCandidateId;
    
    if (candidateProfile.email) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', candidateProfile.email)
        .single();

      if (existingProfile) {
        // Use existing profile's ID
        actualCandidateId = existingProfile.id;
        console.log('Found existing profile for candidate:', existingProfile.email, 'ID:', actualCandidateId);
        
        // Update profile with parsed resume data if missing
        await supabase
          .from('profiles')
          .update({
            full_name: candidateProfile.full_name || existingProfile.full_name,
            experience_level: candidateProfile.experience_level,
            preferred_role: candidateProfile.preferred_role,
            location: candidateProfile.location,
            mobile: candidateProfile.mobile,
            resume_url: resumeUrl || undefined,
          })
          .eq('id', existingProfile.id);
      }
    }

    // Build prompt for AI analysis with all available candidate data
    const candidateSkills = candidateProfile.skills?.join(', ') || 'Not specified';
    
    const prompt = `You are an expert HR analyst. Analyze this candidate's profile against the job requirements and provide a comprehensive evaluation.

CANDIDATE PROFILE:
- Name: ${candidateProfile.full_name}
- Email: ${candidateProfile.email}
- Experience Level: ${candidateProfile.experience_level || 'Not specified'}
- Preferred Role: ${candidateProfile.preferred_role || 'Not specified'}
- Location: ${candidateProfile.location || 'Not specified'}
- Skills: ${candidateSkills}
- Education: ${candidateProfile.education || 'Not specified'}
- Phone: ${candidateProfile.mobile || 'Not specified'}

JOB DETAILS:
- Title: ${jobDetails.job_title}
- Description: ${jobDetails.description || 'Not specified'}
- Requirements: ${jobDetails.requirements || 'Not specified'}
- Required Skills: ${jobDetails.skills?.join(', ') || 'Not specified'}
- Experience Required: ${jobDetails.experience_required || 'Not specified'}
- Location: ${jobDetails.location || 'Not specified'}

Provide your analysis using the suggest_analysis function.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert HR analyst specializing in candidate evaluation and job matching.' },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_analysis',
              description: 'Return the candidate analysis with scoring',
              parameters: {
                type: 'object',
                properties: {
                  overall_score: { type: 'number', minimum: 0, maximum: 100, description: 'Overall match score 0-100' },
                  skill_match_score: { type: 'number', minimum: 0, maximum: 100, description: 'Skills alignment score' },
                  experience_match_score: { type: 'number', minimum: 0, maximum: 100, description: 'Experience level match score' },
                  location_match_score: { type: 'number', minimum: 0, maximum: 100, description: 'Location compatibility score' },
                  recommendation: { type: 'string', enum: ['strong_yes', 'yes', 'maybe', 'no'], description: 'Hiring recommendation' },
                  strengths: { type: 'array', items: { type: 'string' }, description: 'Key strengths' },
                  concerns: { type: 'array', items: { type: 'string' }, description: 'Potential concerns' },
                  summary: { type: 'string', description: 'Brief summary of the candidate fit' },
                  suggested_interview_focus: { type: 'array', items: { type: 'string' }, description: 'Areas to focus on during interview' }
                },
                required: ['overall_score', 'skill_match_score', 'experience_match_score', 'recommendation', 'strengths', 'summary'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_analysis' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI analysis failed');
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No analysis returned from AI');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    
    // Include parsed candidate profile data in the analysis for display in talent pool
    const enrichedAnalysis = {
      ...analysis,
      candidate_data: {
        full_name: candidateProfile.full_name,
        email: candidateProfile.email,
        mobile: candidateProfile.mobile,
        location: candidateProfile.location,
        experience_level: candidateProfile.experience_level,
        preferred_role: candidateProfile.preferred_role,
        skills: candidateProfile.skills || [],
        education: candidateProfile.education,
      }
    };
    
    console.log('AI Analysis completed with candidate data:', enrichedAnalysis);

    // Get the second stage (AI Phone Interview) for next step
    const { data: stages } = await supabase
      .from('interview_stages')
      .select('id, name, stage_order')
      .order('stage_order', { ascending: true });

    const resumeScreeningStage = stages?.find(s => s.stage_order === 1);
    const nextStage = stages?.find(s => s.stage_order === 2);

    // Create interview candidate record with enriched analysis data
    const { data: interviewCandidate, error: candidateError } = await supabase
      .from('interview_candidates')
      .upsert({
        job_id: jobId,
        candidate_id: actualCandidateId,
        current_stage_id: nextStage?.id || resumeScreeningStage?.id,
        ai_score: enrichedAnalysis.overall_score,
        ai_analysis: enrichedAnalysis,
        resume_url: resumeUrl,
        status: 'active'
      }, { onConflict: 'job_id,candidate_id' })
      .select()
      .single();

    if (candidateError) {
      console.error('Error creating interview candidate:', candidateError);
      throw candidateError;
    }

    console.log('Interview candidate created:', interviewCandidate.id);

    // Create interview event for resume screening as completed
    const { error: screeningEventError } = await supabase
      .from('interview_events')
      .insert({
        interview_candidate_id: interviewCandidate.id,
        stage_id: resumeScreeningStage?.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        ai_feedback: enrichedAnalysis,
        ai_score: enrichedAnalysis.overall_score
      });

    if (screeningEventError) {
      console.error('Error creating screening event:', screeningEventError);
    }

    // Create pending event for next stage (AI Phone Interview)
    if (nextStage) {
      const { error: nextEventError } = await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidate.id,
          stage_id: nextStage.id,
          status: 'pending',
          scheduled_at: null
        });

      if (nextEventError) {
        console.error('Error creating next stage event:', nextEventError);
      }
    }

    // Get employer/company info for email
    const { data: jobWithEmployer } = await supabase
      .from('jobs')
      .select('*, employer:profiles!jobs_employer_id_fkey(company_name)')
      .eq('id', jobId)
      .single();

    const companyName = jobWithEmployer?.employer?.company_name || 'Gradia';

    // Send interview invitation email
    let emailSent = false;
    if (RESEND_API_KEY && candidateProfile.email) {
      try {
        const emailResult = await sendInterviewInvitationEmail(RESEND_API_KEY, {
          candidateName: candidateProfile.full_name,
          candidateEmail: candidateProfile.email,
          jobTitle: jobDetails.job_title,
          companyName: companyName,
          stageName: nextStage?.name || 'AI Phone Interview',
          aiScore: analysis.overall_score,
          recommendation: analysis.recommendation
        });
        
        emailSent = !emailResult.error;
        console.log('Interview invitation email sent:', emailSent);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      interviewCandidateId: interviewCandidate.id,
      analysis: enrichedAnalysis,
      emailSent,
      nextStage: nextStage?.name || 'AI Phone Interview'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-resume function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
