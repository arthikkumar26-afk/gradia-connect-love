import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProgressRequest {
  interviewCandidateId: string;
  autoProgressAll?: boolean; // If true, auto-progress through all AI-automated stages
}

async function evaluateStageWithAI(
  LOVABLE_API_KEY: string,
  candidateName: string,
  jobTitle: string,
  stageName: string,
  previousScore: number,
  previousAnalysis: any
): Promise<{
  score: number;
  passed: boolean;
  feedback: string;
  details: any;
}> {
  const stagePrompts: Record<string, string> = {
    'Resume Screening': `Evaluate the candidate's resume and profile match with the job requirements.`,
    'AI Phone Interview': `Conduct a simulated AI phone screening. Evaluate communication readiness, role understanding, and initial fit based on their profile.`,
    'Technical Assessment': `Evaluate the candidate's technical competencies based on their stated skills and experience level for the ${jobTitle} role.`,
    'HR Round': `Evaluate cultural fit, communication skills, and overall professionalism of the candidate.`,
    'Final Review': `Provide a final comprehensive evaluation considering all previous stages and overall candidacy.`,
    'Offer Stage': `Confirm the candidate is ready to receive an offer based on all evaluations.`,
  };

  const prompt = `You are an AI interviewer conducting the "${stageName}" stage for a job candidate.

CANDIDATE: ${candidateName}
POSITION: ${jobTitle}
STAGE: ${stageName}
PREVIOUS AI SCORE: ${previousScore}%

PREVIOUS ANALYSIS:
${JSON.stringify(previousAnalysis, null, 2)}

TASK: ${stagePrompts[stageName] || 'Evaluate the candidate for this interview stage.'}

Consider:
1. The candidate's qualifications and experience
2. Their match with the job requirements
3. Red flags or concerns from previous analysis
4. Overall potential for success in the role

Provide your evaluation using the stage_evaluation function.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert AI interviewer who provides thorough and fair evaluations.' },
        { role: 'user', content: prompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'stage_evaluation',
            description: 'Return the stage evaluation results',
            parameters: {
              type: 'object',
              properties: {
                score: { type: 'number', minimum: 0, maximum: 100, description: 'Stage score 0-100' },
                passed: { type: 'boolean', description: 'Whether candidate passed this stage (true if score >= 60)' },
                feedback: { type: 'string', description: 'Detailed feedback for the candidate' },
                key_observations: { type: 'array', items: { type: 'string' }, description: 'Key observations from this stage' },
                areas_of_concern: { type: 'array', items: { type: 'string' }, description: 'Any concerns identified' },
                next_stage_recommendations: { type: 'string', description: 'Recommendations for the next stage' },
                confidence_level: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Confidence in this evaluation' }
              },
              required: ['score', 'passed', 'feedback', 'key_observations', 'confidence_level'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'stage_evaluation' } }
    }),
  });

  if (!response.ok) {
    throw new Error(`AI evaluation failed: ${response.status}`);
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    throw new Error('No evaluation returned from AI');
  }

  const evaluation = JSON.parse(toolCall.function.arguments);
  
  return {
    score: evaluation.score,
    passed: evaluation.passed,
    feedback: evaluation.feedback,
    details: evaluation
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

    const { interviewCandidateId, autoProgressAll = true }: ProgressRequest = await req.json();

    console.log('Auto-progressing pipeline for candidate:', interviewCandidateId);

    // Get candidate with all related data
    const { data: candidate, error: candidateError } = await supabase
      .from('interview_candidates')
      .select(`
        *,
        current_stage:interview_stages(*),
        profiles:candidate_id(*),
        jobs:job_id(*)
      `)
      .eq('id', interviewCandidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Interview candidate not found');
    }

    if (candidate.status !== 'active') {
      return new Response(JSON.stringify({
        success: false,
        message: `Candidate is ${candidate.status}, cannot progress`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all stages
    const { data: stages } = await supabase
      .from('interview_stages')
      .select('*')
      .order('stage_order', { ascending: true });

    if (!stages || stages.length === 0) {
      throw new Error('No interview stages configured');
    }

    const currentStageOrder = candidate.current_stage?.stage_order || 1;
    const results: any[] = [];

    // Process each stage sequentially
    for (const stage of stages) {
      if (stage.stage_order < currentStageOrder) {
        continue; // Skip already completed stages
      }

      if (!stage.is_ai_automated && stage.stage_order !== currentStageOrder) {
        // Stop at non-automated stages (require manual intervention)
        console.log(`Stopping at non-automated stage: ${stage.name}`);
        break;
      }

      console.log(`Processing stage: ${stage.name} (order: ${stage.stage_order})`);

      // Evaluate this stage with AI
      const evaluation = await evaluateStageWithAI(
        LOVABLE_API_KEY,
        candidate.profiles?.full_name || 'Unknown',
        candidate.jobs?.job_title || 'Unknown Position',
        stage.name,
        candidate.ai_score || 70,
        candidate.ai_analysis || {}
      );

      console.log(`Stage ${stage.name} evaluation:`, evaluation.score, evaluation.passed);

      // Record the event
      const { error: eventError } = await supabase
        .from('interview_events')
        .upsert({
          interview_candidate_id: interviewCandidateId,
          stage_id: stage.id,
          status: evaluation.passed ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          ai_feedback: evaluation.details,
          ai_score: evaluation.score,
          notes: evaluation.feedback
        }, { 
          onConflict: 'interview_candidate_id,stage_id',
          ignoreDuplicates: false 
        });

      if (eventError) {
        console.error('Error recording event:', eventError);
      }

      results.push({
        stage: stage.name,
        stageOrder: stage.stage_order,
        score: evaluation.score,
        passed: evaluation.passed,
        feedback: evaluation.feedback
      });

      if (!evaluation.passed) {
        // Candidate failed this stage
        await supabase
          .from('interview_candidates')
          .update({ 
            status: 'rejected',
            current_stage_id: stage.id
          })
          .eq('id', interviewCandidateId);

        return new Response(JSON.stringify({
          success: true,
          status: 'rejected',
          rejectedAt: stage.name,
          results,
          message: `Candidate did not pass ${stage.name} (Score: ${evaluation.score}%)`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Move to next stage
      const nextStage = stages.find(s => s.stage_order === stage.stage_order + 1);
      
      if (nextStage) {
        await supabase
          .from('interview_candidates')
          .update({ current_stage_id: nextStage.id })
          .eq('id', interviewCandidateId);

        // If not auto-progressing all, stop after one stage
        if (!autoProgressAll) {
          return new Response(JSON.stringify({
            success: true,
            status: 'progressed',
            currentStage: nextStage.name,
            results,
            message: `Candidate advanced to ${nextStage.name}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // Completed all stages - ready for offer/hire
        await supabase
          .from('interview_candidates')
          .update({ status: 'hired' })
          .eq('id', interviewCandidateId);

        return new Response(JSON.stringify({
          success: true,
          status: 'completed',
          results,
          message: 'Candidate has successfully completed all interview stages!'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Small delay between stages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get final state
    const { data: finalCandidate } = await supabase
      .from('interview_candidates')
      .select('*, current_stage:interview_stages(*)')
      .eq('id', interviewCandidateId)
      .single();

    return new Response(JSON.stringify({
      success: true,
      status: 'progressed',
      currentStage: finalCandidate?.current_stage?.name,
      results,
      message: `Pipeline processing complete. Current stage: ${finalCandidate?.current_stage?.name}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-progress-pipeline:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
