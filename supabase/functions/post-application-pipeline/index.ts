import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function processInitialPipeline(interviewCandidateId: string, analysisData: any) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const DELAY = 5000;

  // Step 1: Send Instruction Email via gateway
  console.log('Step 1: Sending instruction email via gateway...');
  await sendViaGateway(supabaseUrl, supabaseServiceKey, {
    interviewCandidateId,
    stageName: 'Interview Guidelines',
    emailType: 'instruction',
    triggerSource: 'post-application-pipeline',
  });

  // Step 2: Send CV/Resume ATS results email via gateway
  console.log('Waiting before CV results email...');
  await new Promise(resolve => setTimeout(resolve, DELAY));

  console.log('Step 2: Sending CV/Resume ATS results email via gateway...');
  await sendViaGateway(supabaseUrl, supabaseServiceKey, {
    interviewCandidateId,
    stageName: 'CV/Resume',
    emailType: 'cv_results',
    triggerSource: 'post-application-pipeline',
    analysisData: analysisData || null,
  });

  // Step 3: Advance to Written Test Slot Booking + send slot booking email via gateway
  console.log('Waiting before Written Test slot booking...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'Written Test Slot Booking');
  
  console.log('Step 3: Sending Written Test slot booking email via gateway...');
  await sendViaGateway(supabaseUrl, supabaseServiceKey, {
    interviewCandidateId,
    stageName: 'Written Test Slot Booking',
    emailType: 'slot_booking',
    triggerSource: 'post-application-pipeline',
  });

  console.log('Initial pipeline completed. Next stages will trigger on completion events.');
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
      message: 'Initial pipeline completed (Instruction → CV Results → Written Test Slot Booking). Next stages trigger on completion.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in post-application-pipeline:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
