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
    console.log('Candidate details from resume:', {
      name: candidateProfile.full_name,
      email: candidateProfile.email,
      skills: candidateProfile.skills?.length || 0,
      experience: candidateProfile.experience_level
    });

    // Check if a profile with this email already exists, or create one
    let actualCandidateId = originalCandidateId;
    
    if (candidateProfile.email) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', candidateProfile.email)
        .maybeSingle();

      if (existingProfile) {
        actualCandidateId = existingProfile.id;
        console.log('Found existing profile for candidate:', existingProfile.email, 'ID:', actualCandidateId);
        
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
        console.log('Created new profile for candidate:', candidateProfile.email, 'ID:', actualCandidateId);
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
    console.log('AI response structure:', JSON.stringify(aiResponse.choices?.[0]?.message, null, 2));
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;
    
    if (toolCall) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiResponse.choices?.[0]?.message?.content;
      console.log('No tool call, trying content fallback:', content?.substring(0, 200));
      
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysis = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Failed to parse content as JSON:', e);
          }
        }
      }
      
      if (!analysis) {
        console.log('Creating default analysis due to AI response format');
        analysis = {
          overall_score: 50,
          skill_match_score: 50,
          experience_match_score: 50,
          location_match_score: 50,
          recommendation: 'maybe',
          strengths: ['Candidate profile submitted for review'],
          concerns: ['Manual review recommended'],
          summary: 'Automated analysis could not be completed. Please review the candidate profile manually.',
          suggested_interview_focus: ['General skills assessment', 'Experience verification']
        };
      }
    }
    
    // Include parsed candidate profile data in the analysis
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

    // Get all interview stages
    const { data: stages } = await supabase
      .from('interview_stages')
      .select('id, name, stage_order')
      .order('stage_order', { ascending: true });

    const interviewGuidelinesStage = stages?.find(s => s.stage_order === 0);
    const resumeScreeningStage = stages?.find(s => s.stage_order === 1);
    const writtenTestSlotBookingStage = stages?.find(s => s.stage_order === 2);

    // Create interview candidate record - start at Written Test Slot Booking stage
    // (Interview Guidelines and CV/Resume will be marked as completed via events)
    const { data: interviewCandidate, error: candidateError } = await supabase
      .from('interview_candidates')
      .upsert({
        job_id: jobId,
        candidate_id: actualCandidateId,
        current_stage_id: writtenTestSlotBookingStage?.id || resumeScreeningStage?.id,
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

    // Create completed event for Interview Guidelines (stage 0)
    if (interviewGuidelinesStage) {
      const { error: guidelinesEventError } = await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidate.id,
          stage_id: interviewGuidelinesStage.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: 'Interview guidelines sent to candidate',
        });

      if (guidelinesEventError) {
        console.error('Error creating guidelines event:', guidelinesEventError);
      }
    }

    // Create completed event for CV/Resume screening (stage 1)
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
      }
    }

    // Fire-and-forget: Trigger the post-application pipeline for timed email sequence
    // This sends: Instruction email → (10s) → CV Results email → (10s) → Slot Booking email
    console.log('Triggering post-application pipeline for timed email sequence...');
    fetch(`${supabaseUrl}/functions/v1/post-application-pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ interviewCandidateId: interviewCandidate.id }),
    }).catch(err => console.error('Failed to trigger post-application pipeline:', err));

    return new Response(JSON.stringify({
      success: true,
      interviewCandidateId: interviewCandidate.id,
      analysis: enrichedAnalysis,
      emailSent: true,
      nextStage: writtenTestSlotBookingStage?.name || 'Written Test Slot Booking'
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
