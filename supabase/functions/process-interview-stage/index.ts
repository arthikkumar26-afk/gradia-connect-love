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
  expectedStageName?: string;
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

    const { interviewCandidateId, action, feedback, score, expectedStageName }: ProcessStageRequest = await req.json();

    console.log('Processing interview stage:', { interviewCandidateId, action, expectedStageName });

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

    const currentStageOrder = interviewCandidate.current_stage?.stage_order ?? 0;
    const currentStage = stages.find(s => s.stage_order === currentStageOrder);
    
    // Determine next stage using job-specific pipeline if available
    let nextStage = stages.find(s => s.stage_order === currentStageOrder + 1);
    const injectedRoundAfterSlotBooking: Record<string, string> = {
      'Segment Round Slot Booking': 'Segment Round',
      'Admin & Academic Round Slot Booking': 'Admin & Academic Round',
      'Core Team Round Slot Booking': 'Core Team Round',
      'Management Round Slot Booking': 'Management Round',
      'HR Round Slot Booking': 'HR Round',
    };
    
    // Check if the job has a custom pipeline_stages config
    const pipelineStages = interviewCandidate.job?.pipeline_stages as any[] | null;
    if (pipelineStages && pipelineStages.length > 0) {
      const currentStageName = currentStage?.name;
      const injectedRoundName = currentStageName ? injectedRoundAfterSlotBooking[currentStageName] : undefined;

      if (injectedRoundName && !pipelineStages.some((ps: any) => ps.name === injectedRoundName)) {
        const injectedRoundStage = stages.find(s => s.name === injectedRoundName);
        if (injectedRoundStage) {
          nextStage = injectedRoundStage;
          console.log(`Job-specific pipeline: injecting live round "${injectedRoundName}" after "${currentStageName}"`);
        }
      } else {
        const slotStageNameForInjectedRound = Object.entries(injectedRoundAfterSlotBooking)
          .find(([, roundName]) => roundName === currentStageName)?.[0];
        const pipelineLookupStageName = slotStageNameForInjectedRound || currentStageName;
        const currentPipelineIndex = pipelineStages.findIndex((ps: any) => ps.name === pipelineLookupStageName);

        if (currentPipelineIndex >= 0 && currentPipelineIndex < pipelineStages.length - 1) {
          const nextPipelineStageName = pipelineStages[currentPipelineIndex + 1].name;
          const nextPipelineStage = stages.find(s => s.name === nextPipelineStageName);
          if (nextPipelineStage) {
            nextStage = nextPipelineStage;
            console.log(`Job-specific pipeline: advancing from "${currentStageName}" via "${pipelineLookupStageName}" to "${nextPipelineStageName}" (order ${nextPipelineStage.stage_order})`);
          }
        }
      }
    }

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
      if (expectedStageName && currentStage?.name !== expectedStageName) {
        return new Response(JSON.stringify({
          success: true,
          action: 'ignored',
          message: `Candidate already moved past ${expectedStageName}`,
          currentStage: currentStage?.name || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let eventAiScore = score || interviewCandidate.ai_score;
      let eventAiFeedback: any = null;

      if (currentStage?.name === 'CV/Resume' && interviewCandidate.ai_analysis) {
        const analysis = interviewCandidate.ai_analysis as any;
        eventAiScore = analysis.overall_score || interviewCandidate.ai_score || eventAiScore;
        eventAiFeedback = analysis;
        console.log('Using candidate AI analysis for CV/Resume event, score:', eventAiScore);
      }

      // Mark current stage as completed
      await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidateId,
          stage_id: currentStage?.id,
          status: 'passed',
          completed_at: new Date().toISOString(),
          notes: feedback,
          ai_score: eventAiScore,
          ai_feedback: eventAiFeedback
        });

      if (nextStage) {
        let targetStage = nextStage;

        // Skip only Demo Round (the meeting happens via the slot booking confirmation)
        // All other rounds (Segment, Admin & Academic, Core Team, Management, HR) are visible
        // so candidates can see "Join Meeting" button on the Round stage itself
        const roundStagesToSkip = [
          'Demo Round'
        ];
        
        if (roundStagesToSkip.includes(nextStage.name)) {
          // Find the feedback stage after the round stage
          const feedbackStage = stages.find(s => s.stage_order === nextStage.stage_order + 1);
          if (feedbackStage) {
            // Mark Round as auto-passed
            await supabase
              .from('interview_events')
              .insert({
                interview_candidate_id: interviewCandidateId,
                stage_id: nextStage.id,
                status: 'passed',
                completed_at: new Date().toISOString(),
                notes: `${nextStage.name} auto-completed — slot booking confirmed`,
              });
            targetStage = feedbackStage;
            console.log(`Skipping ${nextStage.name}, advancing directly to ${targetStage.name}`);
          }
        }

        // Move to target stage
        await supabase
          .from('interview_candidates')
          .update({ current_stage_id: targetStage.id })
          .eq('id', interviewCandidateId);

        // Check if target stage is offer stage
        if (targetStage.name === 'Offer Stage') {
          console.log('Candidate ready for offer letter generation');
        }

        // ─── ROUTE ALL EMAILS THROUGH PIPELINE EMAIL GATEWAY ───
        const isFeedbackStage = targetStage.name.toLowerCase().includes('feedback');
        const isSlotBookingStage = targetStage.name.toLowerCase().includes('slot booking');

        if (isFeedbackStage) {
          try {
            console.log(`[GATEWAY] Sending feedback email via pipeline gateway for: ${targetStage.name}`);
            const feedbackTypeMap: Record<string, string> = {
              'Demo Feedback': 'demo',
              'HR Feedback': 'hr',
              'Segment Feedback': 'segment',
              'Admin & Academic Feedback': 'admin_academic',
              'Core Team Feedback': 'core_team',
              'Management Feedback': 'management',
              'Management Round Feedback': 'management',
            };
            const feedbackType = feedbackTypeMap[targetStage.name] || 'demo';
            
            const gatewayResponse = await fetch(`${supabaseUrl}/functions/v1/send-pipeline-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                interviewCandidateId,
                stageName: targetStage.name,
                emailType: 'feedback_request',
                triggerSource: 'process-interview-stage',
                feedbackType,
              }),
            });
            const gatewayResult = await gatewayResponse.json();
            console.log(`[GATEWAY] Feedback email result for ${targetStage.name}:`, gatewayResult);
          } catch (feedbackErr) {
            console.error('Failed to send feedback email via gateway (non-blocking):', feedbackErr);
          }
        }

        if (isSlotBookingStage) {
          try {
            console.log(`[GATEWAY] Sending slot booking email via pipeline gateway for: ${targetStage.name}`);
            const gatewayResponse = await fetch(`${supabaseUrl}/functions/v1/send-pipeline-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                interviewCandidateId,
                stageName: targetStage.name,
                emailType: 'slot_booking',
                triggerSource: 'process-interview-stage',
              }),
            });
            const gatewayResult = await gatewayResponse.json();
            console.log(`[GATEWAY] Slot booking email result for ${targetStage.name}:`, gatewayResult);
          } catch (emailErr) {
            console.error('Failed to send slot booking email via gateway (non-blocking):', emailErr);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          action: 'advanced',
          previousStage: currentStage?.name,
          currentStage: targetStage.name,
          message: `Candidate advanced to ${targetStage.name}`
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
