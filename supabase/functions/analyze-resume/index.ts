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

    const { candidateId, jobId, resumeUrl, candidateProfile, jobDetails }: ResumeAnalysisRequest = await req.json();

    console.log('Analyzing resume for candidate:', candidateId, 'job:', jobId);

    // Build prompt for AI analysis
    const prompt = `You are an expert HR analyst. Analyze this candidate's profile against the job requirements and provide a comprehensive evaluation.

CANDIDATE PROFILE:
- Name: ${candidateProfile.full_name}
- Email: ${candidateProfile.email}
- Experience Level: ${candidateProfile.experience_level || 'Not specified'}
- Preferred Role: ${candidateProfile.preferred_role || 'Not specified'}
- Location: ${candidateProfile.location || 'Not specified'}

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
    console.log('AI Analysis completed:', analysis);

    // Get the first stage (Resume Screening)
    const { data: firstStage } = await supabase
      .from('interview_stages')
      .select('id')
      .eq('stage_order', 1)
      .single();

    // Create interview candidate record
    const { data: interviewCandidate, error: candidateError } = await supabase
      .from('interview_candidates')
      .upsert({
        job_id: jobId,
        candidate_id: candidateId,
        current_stage_id: firstStage?.id,
        ai_score: analysis.overall_score,
        ai_analysis: analysis,
        resume_url: resumeUrl,
        status: 'active'
      }, { onConflict: 'job_id,candidate_id' })
      .select()
      .single();

    if (candidateError) {
      console.error('Error creating interview candidate:', candidateError);
      throw candidateError;
    }

    // Create initial interview event for resume screening
    const { error: eventError } = await supabase
      .from('interview_events')
      .insert({
        interview_candidate_id: interviewCandidate.id,
        stage_id: firstStage?.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        ai_feedback: analysis,
        ai_score: analysis.overall_score
      });

    if (eventError) {
      console.error('Error creating interview event:', eventError);
    }

    return new Response(JSON.stringify({
      success: true,
      interviewCandidateId: interviewCandidate.id,
      analysis
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
