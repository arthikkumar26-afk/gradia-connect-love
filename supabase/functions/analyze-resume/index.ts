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
    subject: `🎉 Great News! You've Been Selected for ${params.jobTitle} at ${params.companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px; font-size: 28px; }
          .content { background: #ffffff; padding: 30px; }
          .score-card { background: linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 1px solid #e0e7ff; }
          .score { font-size: 48px; font-weight: bold; color: #667eea; }
          .score-label { color: #666; font-size: 14px; margin-top: 5px; }
          .highlight { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .next-steps { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .next-steps h3 { color: #16a34a; margin-top: 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; background: #f9fafb; }
          .badge { display: inline-block; background: ${params.recommendation === 'strong_yes' ? '#16a34a' : params.recommendation === 'yes' ? '#2563eb' : '#f59e0b'}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 Congratulations, ${params.candidateName}!</h1>
            <p style="margin: 0; opacity: 0.9;">Your application has been reviewed by our AI</p>
          </div>
          <div class="content">
            <p>We are thrilled to inform you that your profile has been <strong>successfully reviewed</strong> for the position of <strong>${params.jobTitle}</strong> at <strong>${params.companyName}</strong>.</p>
            
            <div class="score-card">
              <div class="score">${params.aiScore}%</div>
              <div class="score-label">AI Match Score</div>
              <div style="margin-top: 15px;">
                <span class="badge">${params.recommendation === 'strong_yes' ? '⭐ Excellent Match' : params.recommendation === 'yes' ? '✓ Good Match' : '• Potential Match'}</span>
              </div>
            </div>
            
            <div class="highlight">
              <h3 style="margin-top: 0; color: #667eea;">📋 Application Status</h3>
              <p><strong>Current Stage:</strong> ${params.stageName}</p>
              <p><strong>Position:</strong> ${params.jobTitle}</p>
              <p><strong>Company:</strong> ${params.companyName}</p>
              <p style="margin-bottom: 0;"><strong>Status:</strong> Under Review ✓</p>
            </div>
            
            <div class="next-steps">
              <h3>🚀 What Happens Next?</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Our hiring team will review your profile</li>
                <li>If shortlisted, you'll receive an interview invitation</li>
                <li>Prepare for potential technical assessments</li>
                <li>Keep an eye on your inbox for updates!</li>
              </ol>
            </div>
            
            <p style="color: #666;">We appreciate your interest in joining our team. We'll be in touch soon with the next steps.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br><strong>The ${params.companyName} Hiring Team</strong></p>
            <p style="font-size: 12px; color: #999;">This is an automated message from Gradia Job Portal</p>
          </div>
        </div>
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
