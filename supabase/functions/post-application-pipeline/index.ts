import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeErrorMessage } from "../_shared/safeError.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Post-Application Pipeline (Event-Driven)
 * 
 * Routes ALL emails through the pipeline email gateway for:
 * - Idempotency (no duplicate emails)
 * - Stage validation (no backward emails)
 * - Logging (full audit trail)
 */

async function advanceCandidateToStage(supabase: any, interviewCandidateId: string, stageName: string) {
  const { data: stage } = await supabase
    .from('interview_stages')
    .select('id, stage_order')
    .eq('name', stageName)
    .single();

  if (!stage) {
    console.log(`Stage "${stageName}" not found, skipping`);
    return null;
  }

  const { data: ic } = await supabase
    .from('interview_candidates')
    .select('current_stage_id, current_stage:interview_stages!interview_candidates_current_stage_id_fkey(stage_order)')
    .eq('id', interviewCandidateId)
    .single();

  const currentOrder = (ic?.current_stage as any)?.stage_order ?? -1;
  if (currentOrder < stage.stage_order) {
    await supabase
      .from('interview_candidates')
      .update({ current_stage_id: stage.id })
      .eq('id', interviewCandidateId);
    console.log(`Advanced candidate to "${stageName}" (order ${stage.stage_order})`);
  } else {
    console.log(`Candidate already at or past "${stageName}", skipping advancement`);
  }

  await supabase
    .from('interview_events')
    .insert({
      interview_candidate_id: interviewCandidateId,
      stage_id: stage.id,
      status: 'pending',
      notes: `Auto-advanced via pipeline`,
    });

  return stage;
}

async function sendViaGateway(supabaseUrl: string, serviceKey: string, body: any) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-pipeline-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    console.log(`[GATEWAY] ${body.emailType} for "${body.stageName}":`, result);
    return result;
  } catch (err) {
    console.error(`[GATEWAY] Failed ${body.emailType} for "${body.stageName}":`, err);
    return null;
  }
}

async function processInitialPipeline(interviewCandidateId: string, _analysisData: any) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Only send the initial alert/instruction email when interview starts.
  // CV results, slot booking, and all other stage emails are triggered
  // individually when each stage is completed or advanced by the employer.
  console.log('Sending interview started alert email via gateway...');
  await sendViaGateway(supabaseUrl, supabaseServiceKey, {
    interviewCandidateId,
    stageName: 'Interview Guidelines',
    emailType: 'instruction',
    triggerSource: 'post-application-pipeline',
  });

  console.log('Interview alert email sent. Subsequent emails will be sent per-stage.');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewCandidateId, analysisData } = await req.json();

    if (!interviewCandidateId) {
      throw new Error('interviewCandidateId is required');
    }

    console.log('Starting initial post-application pipeline for:', interviewCandidateId);

    await processInitialPipeline(interviewCandidateId, analysisData);

    return new Response(JSON.stringify({
      success: true,
      message: 'Interview alert email sent. Subsequent stage emails will trigger individually.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in post-application-pipeline:', error);
    return new Response(JSON.stringify({
      error: safeErrorMessage(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
