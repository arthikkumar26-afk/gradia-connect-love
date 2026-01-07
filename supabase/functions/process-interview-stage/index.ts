import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessStageRequest {
  interviewCandidateId: string;
  action: 'advance' | 'reject' | 'evaluate';
  feedback?: string;
  score?: number;
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

    const { interviewCandidateId, action, feedback, score }: ProcessStageRequest = await req.json();

    console.log('Processing interview stage:', { interviewCandidateId, action });

    // Get current interview candidate with stage info
    const { data: interviewCandidate, error: candidateError } = await supabase
      .from('interview_candidates')
      .select(`
        *,
        current_stage:interview_stages(*),
        candidate:profiles(*),
        job:jobs(*)
      `)
      .eq('id', interviewCandidateId)
      .single();

    if (candidateError || !interviewCandidate) {
      throw new Error('Interview candidate not found');
    }

    // Get all stages ordered
    const { data: stages } = await supabase
      .from('interview_stages')
      .select('*')
      .order('stage_order', { ascending: true });

    if (!stages || stages.length === 0) {
      throw new Error('No interview stages configured');
    }

    const currentStageOrder = interviewCandidate.current_stage?.stage_order || 1;
    const currentStage = stages.find(s => s.stage_order === currentStageOrder);
    const nextStage = stages.find(s => s.stage_order === currentStageOrder + 1);

    if (action === 'reject') {
      // Update candidate status to rejected
      await supabase
        .from('interview_candidates')
        .update({ status: 'rejected' })
        .eq('id', interviewCandidateId);

      // Create rejection event
      await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidateId,
          stage_id: currentStage?.id,
          status: 'failed',
          completed_at: new Date().toISOString(),
          notes: feedback || 'Candidate rejected',
          ai_score: score
        });

      return new Response(JSON.stringify({
        success: true,
        action: 'rejected',
        message: 'Candidate has been rejected'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'advance') {
      // Mark current stage as completed
      await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidateId,
          stage_id: currentStage?.id,
          status: 'passed',
          completed_at: new Date().toISOString(),
          notes: feedback,
          ai_score: score || interviewCandidate.ai_score
        });

      if (nextStage) {
        // Move to next stage
        await supabase
          .from('interview_candidates')
          .update({ current_stage_id: nextStage.id })
          .eq('id', interviewCandidateId);

        // Check if next stage is offer stage
        if (nextStage.name === 'Offer Stage') {
          // Trigger offer letter generation
          console.log('Candidate ready for offer letter generation');
        }

        return new Response(JSON.stringify({
          success: true,
          action: 'advanced',
          previousStage: currentStage?.name,
          currentStage: nextStage.name,
          message: `Candidate advanced to ${nextStage.name}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // No more stages - candidate is ready for hire
        await supabase
          .from('interview_candidates')
          .update({ status: 'hired' })
          .eq('id', interviewCandidateId);

        return new Response(JSON.stringify({
          success: true,
          action: 'hired',
          message: 'Candidate has completed all stages and is ready for hire!'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'evaluate') {
      // AI evaluation for current stage
      const prompt = `You are an expert interviewer. Based on the candidate's progress, provide an evaluation for the "${currentStage?.name}" stage.

CANDIDATE: ${interviewCandidate.candidate?.full_name}
JOB: ${interviewCandidate.job?.job_title}
CURRENT STAGE: ${currentStage?.name}
PREVIOUS AI SCORE: ${interviewCandidate.ai_score}

${feedback ? `INTERVIEWER NOTES: ${feedback}` : ''}

Provide your evaluation using the evaluate_stage function.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert interviewer providing stage evaluations.' },
            { role: 'user', content: prompt }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'evaluate_stage',
                description: 'Return the stage evaluation',
                parameters: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 100, description: 'Stage score 0-100' },
                    passed: { type: 'boolean', description: 'Whether candidate passed this stage' },
                    feedback: { type: 'string', description: 'Detailed feedback for this stage' },
                    next_stage_tips: { type: 'array', items: { type: 'string' }, description: 'Tips for the next stage' },
                    confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Confidence in evaluation' }
                  },
                  required: ['score', 'passed', 'feedback', 'confidence'],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: 'function', function: { name: 'evaluate_stage' } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error('AI evaluation failed');
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
      const evaluation = JSON.parse(toolCall.function.arguments);

      // Record the evaluation
      await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidateId,
          stage_id: currentStage?.id,
          status: evaluation.passed ? 'passed' : 'failed',
          completed_at: new Date().toISOString(),
          ai_feedback: evaluation,
          ai_score: evaluation.score,
          notes: evaluation.feedback
        });

      // Auto-advance if passed
      if (evaluation.passed && nextStage) {
        await supabase
          .from('interview_candidates')
          .update({ current_stage_id: nextStage.id })
          .eq('id', interviewCandidateId);
      } else if (!evaluation.passed) {
        await supabase
          .from('interview_candidates')
          .update({ status: 'rejected' })
          .eq('id', interviewCandidateId);
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'evaluated',
        evaluation,
        advancedTo: evaluation.passed ? nextStage?.name : null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-interview-stage:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
