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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidateId: originalCandidateId, jobId, resumeUrl, candidateProfile, jobDetails }: ResumeAnalysisRequest = await req.json();

    console.log('Analyzing resume for candidate ID:', originalCandidateId, 'job:', jobId);

    // Resolve actual candidate ID based on email
    let actualCandidateId = originalCandidateId;
    
    if (candidateProfile.email) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', candidateProfile.email)
        .maybeSingle();

      if (existingProfile) {
        actualCandidateId = existingProfile.id;
        console.log('Found existing profile:', existingProfile.email, 'ID:', actualCandidateId);
        
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
      } else {
        const newCandidateId = crypto.randomUUID();
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: newCandidateId,
            email: candidateProfile.email,
            full_name: candidateProfile.full_name,
            role: 'candidate',
            experience_level: candidateProfile.experience_level || null,
            preferred_role: candidateProfile.preferred_role || null,
            location: candidateProfile.location || null,
            mobile: candidateProfile.mobile || null,
            resume_url: resumeUrl || null,
          });

        if (profileError) {
          console.error('Error creating candidate profile:', profileError);
          throw new Error('Failed to create candidate profile');
        }
        
        actualCandidateId = newCandidateId;
        console.log('Created new profile:', candidateProfile.email, 'ID:', actualCandidateId);
      }
    }

    // Build prompt for AI analysis
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

    let analysis: any;
    let aiHttpStatus: number | null = null;
    let aiErrorMessage: string | null = null;
    let fallbackReason: 'success' | 'ai_credits' | 'ai_rate_limit' | 'ai_server' | 'ai_other' | 'ai_exception' | 'parse_failed' = 'success';

    try {
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

      aiHttpStatus = response.status;

      if (!response.ok) {
        const errorText = await response.text();
        aiErrorMessage = errorText.slice(0, 500);
        console.error('AI gateway error:', response.status, errorText);

        if (response.status === 402) fallbackReason = 'ai_credits';
        else if (response.status === 429) fallbackReason = 'ai_rate_limit';
        else if (response.status >= 500) fallbackReason = 'ai_server';
        else fallbackReason = 'ai_other';

        const isFallbackable =
          response.status === 402 ||
          response.status === 429 ||
          response.status >= 500;

        if (!isFallbackable) {
          // Log the failed attempt before returning
          await supabase.from('resume_analysis_audit_logs').insert({
            candidate_id: actualCandidateId,
            candidate_email: candidateProfile.email || null,
            job_id: jobId,
            job_title: jobDetails.job_title || null,
            http_status: response.status,
            fallback_reason: fallbackReason,
            used_fallback: false,
            application_state: 'failed',
            overall_score: null,
            error_message: aiErrorMessage,
          }).then(({ error: auditErr }) => {
            if (auditErr) console.error('Failed to write audit log:', auditErr);
          });

          return new Response(
            JSON.stringify({
              error: `AI_ANALYSIS_FAILED_${response.status}`,
              fallback: false,
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        analysis = null;
      } else {
        const aiResponse = await response.json();
        const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall) {
          analysis = JSON.parse(toolCall.function.arguments);
          console.log('AI analysis from tool call, score:', analysis.overall_score);
        } else {
          const content = aiResponse.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                analysis = JSON.parse(jsonMatch[0]);
                console.log('AI analysis from content parse, score:', analysis.overall_score);
              } catch (e) {
                console.error('Failed to parse content as JSON:', e);
                fallbackReason = 'parse_failed';
              }
            } else {
              fallbackReason = 'parse_failed';
            }
          } else {
            fallbackReason = 'parse_failed';
          }
        }
      }
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      fallbackReason = 'ai_exception';
      aiErrorMessage = aiError instanceof Error ? aiError.message.slice(0, 500) : 'Unknown AI exception';
    }

    // Fallback if AI analysis failed
    const usedFallbackAnalysis = !analysis || !analysis.overall_score;
    if (usedFallbackAnalysis) {
      console.log('Using default analysis due to AI response format or upstream availability issue');
      analysis = {
        overall_score: 50,
        skill_match_score: 50,
        experience_match_score: 50,
        location_match_score: 50,
        recommendation: 'maybe',
        strengths: ['Candidate profile submitted for review'],
        concerns: ['Manual review recommended'],
        summary: 'Your application has been submitted and will be reviewed by our hiring team.',
        suggested_interview_focus: ['General skills assessment', 'Experience verification']
      };
    }
    
    // Enrich analysis with candidate data
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
    
    console.log('Enriched analysis overall_score:', enrichedAnalysis.overall_score);

    // Get all interview stages
    const { data: stages } = await supabase
      .from('interview_stages')
      .select('id, name, stage_order')
      .order('stage_order', { ascending: true });

    const interviewGuidelinesStage = stages?.find(s => s.stage_order === 0);
    const resumeScreeningStage = stages?.find(s => s.stage_order === 1);
    const writtenTestSlotBookingStage = stages?.find(s => s.stage_order === 2);

    // Create/update interview candidate record with AI analysis
    // Initially set current_stage_id to Interview Guidelines (stage 0) so it shows
    // immediately in candidate pipeline. Will advance after emails are sent.
    const { data: interviewCandidate, error: candidateError } = await supabase
      .from('interview_candidates')
      .upsert({
        job_id: jobId,
        candidate_id: actualCandidateId,
        current_stage_id: interviewGuidelinesStage?.id || resumeScreeningStage?.id,
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

    console.log('Interview candidate saved:', interviewCandidate.id, 'ai_score:', interviewCandidate.ai_score);

    // Verify the data was actually saved
    const { data: verifyData } = await supabase
      .from('interview_candidates')
      .select('ai_score, ai_analysis')
      .eq('id', interviewCandidate.id)
      .single();
    
    console.log('Verification - saved ai_score:', verifyData?.ai_score, 'has ai_analysis:', !!verifyData?.ai_analysis);

    // Create completed event for Interview Guidelines (stage 0)
    if (interviewGuidelinesStage) {
      await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidate.id,
          stage_id: interviewGuidelinesStage.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: 'Interview guidelines sent to candidate',
        });
    }

    // Create completed event for CV/Resume screening (stage 1) WITH analysis data
    if (resumeScreeningStage) {
      const { error: screeningEventError } = await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidate.id,
          stage_id: resumeScreeningStage.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          ai_feedback: enrichedAnalysis,
          ai_score: enrichedAnalysis.overall_score
        });

      if (screeningEventError) {
        console.error('Error creating screening event:', screeningEventError);
      } else {
        console.log('CV/Resume event created with ai_score:', enrichedAnalysis.overall_score);
      }
    }

    // Trigger post-application pipeline with analysis data passed directly
    // MUST await to ensure the request completes before the isolate shuts down
    console.log('Triggering post-application pipeline...');
    try {
      const pipelineResponse = await fetch(`${supabaseUrl}/functions/v1/post-application-pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          interviewCandidateId: interviewCandidate.id,
          // Pass analysis data directly so email doesn't need to re-fetch
          analysisData: enrichedAnalysis,
        }),
      });
      const pipelineResult = await pipelineResponse.json();
      console.log('Post-application pipeline triggered:', pipelineResult);
    } catch (err) {
      console.error('Failed to trigger post-application pipeline:', err);
    }


    // Write audit log entry for this attempt (success or fallback)
    const applicationState = usedFallbackAnalysis ? 'manual_review' : 'ai_reviewed';
    const { error: auditErr } = await supabase
      .from('resume_analysis_audit_logs')
      .insert({
        candidate_id: actualCandidateId,
        candidate_email: candidateProfile.email || null,
        job_id: jobId,
        job_title: jobDetails.job_title || null,
        http_status: aiHttpStatus,
        fallback_reason: fallbackReason,
        used_fallback: usedFallbackAnalysis,
        application_state: applicationState,
        overall_score: enrichedAnalysis.overall_score ?? null,
        error_message: aiErrorMessage,
      });
    if (auditErr) console.error('Failed to write audit log:', auditErr);

    return new Response(JSON.stringify({
      success: true,
      interviewCandidateId: interviewCandidate.id,
      analysis: enrichedAnalysis,
      emailSent: true,
      nextStage: writtenTestSlotBookingStage?.name || 'Written Test Slot Booking',
      fallback: usedFallbackAnalysis,
      status: applicationState
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
