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
        // Move to next stage
        await supabase
          .from('interview_candidates')
          .update({ current_stage_id: nextStage.id })
          .eq('id', interviewCandidateId);

        // Check if next stage is offer stage
        if (nextStage.name === 'Offer Stage') {
          console.log('Candidate ready for offer letter generation');
        }

        // Auto-send slot booking email when advancing to a Slot Booking stage
        const isSlotBookingStage = nextStage.name.toLowerCase().includes('slot booking');
        if (isSlotBookingStage) {
          try {
            console.log(`Sending slot booking email for stage: ${nextStage.name}`);
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_API_KEY) {
              const candidate = interviewCandidate.candidate;
              const job = interviewCandidate.job;
              
              // Get employer info for branding
              let companyName = 'Gradia';
              if (job?.employer_id) {
                const { data: employer } = await supabase
                  .from('profiles')
                  .select('company_name')
                  .eq('id', job.employer_id)
                  .single();
                companyName = employer?.company_name || 'Gradia';
              }

              // Determine what round this slot booking is for
              const roundName = nextStage.name.replace(' Slot Booking', '');
              const baseUrl = Deno.env.get('APP_DOMAIN') || "https://gradia-link-shine.lovable.app";
              const bookSlotLink = `${baseUrl}/book-slot?candidateId=${interviewCandidateId}&stageId=${nextStage.id}&stageName=${encodeURIComponent(nextStage.name)}`;

              const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: `${companyName} Hiring <noreply@gradia.co.in>`,
                  to: [candidate?.email],
                  reply_to: 'support@gradia.co.in',
                  subject: `📅 Book Your ${roundName} Slot - ${job?.job_title} at ${companyName}`,
                  html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">📅 Book Your ${roundName} Slot</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-align: center;">${roundName} for ${job?.job_title}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p>Dear <strong>${candidate?.full_name}</strong>,</p>
        <p>Congratulations on clearing the previous round! 🎉</p>
        <p>You have been selected for the <strong style="color: #1d4ed8;">${roundName}</strong> for the position of <strong>${job?.job_title}</strong> at <strong>${companyName}</strong>.</p>
        <p>Please select a convenient date and time by clicking the button below:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr><td align="center">
            <a href="${bookSlotLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px;">📅 Book Your Slot Now</a>
          </td></tr>
        </table>
        <p style="font-weight: 600;">Important:</p>
        <ul style="color: #6b7280;">
          <li>Choose a date and time convenient for you</li>
          <li>Ensure stable internet connection</li>
          <li>Please book within 3 days</li>
        </ul>
        <p>Best of luck!<br><strong>The ${companyName} Hiring Team</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          Sent by Gradia Job Portal on behalf of ${companyName}.<br>
          <a href="mailto:support@gradia.co.in" style="color: #3b82f6;">Contact Support</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
                  headers: {
                    'List-Unsubscribe': '<mailto:unsubscribe@gradia.co.in>',
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                  },
                }),
              });
              const emailResult = await emailResponse.json();
              console.log(`Slot booking email sent for ${nextStage.name}:`, emailResult);
            }
          } catch (emailErr) {
            console.error('Failed to send slot booking email (non-blocking):', emailErr);
          }
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
