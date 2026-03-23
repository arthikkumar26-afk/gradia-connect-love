import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Post-Application Pipeline
 * 
 * This function handles the full automated email + stage advancement sequence
 * for ALL interview stages:
 * 1. Send Instruction email → advance to CV/Resume
 * 2. Send CV/Resume ATS results email → advance to Written Test Slot Booking
 * 3. Send Written Test Slot Booking email
 * 4. Advance to Written Test → Send Written Test invitation email
 * 5. Advance to Demo Slot Booking → Send Demo Slot Booking email
 * 6. Advance to Demo Round → Send Demo Round invitation emails
 * 7. Advance to Demo Feedback → Send Demo Feedback request email
 * 8. Advance to HR Round Slot Booking → Send HR Slot Booking email
 * 9. Advance to HR Round → Send HR Round invitation emails
 * 10. Advance to Final Review
 * 11. Advance to Offer Stage
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

  // Check current stage order to avoid rollback
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

  // Create interview event for tracking
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

async function callEdgeFunction(supabaseUrl: string, serviceKey: string, functionName: string, body: any) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    console.log(`${functionName} result:`, result);
    return result;
  } catch (err) {
    console.error(`Failed to call ${functionName}:`, err);
    return null;
  }
}

async function processEmailPipeline(interviewCandidateId: string, analysisData: any) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const DELAY = 5000; // 5 seconds between steps

  // Step 1: Send Instruction Email (advances Interview Guidelines → CV/Resume)
  console.log('Step 1: Sending instruction email...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-instruction-email', {
    interviewCandidateId,
  });

  // Step 2: Send CV/Resume ATS results email
  console.log('Waiting before CV results email...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  console.log('Step 2: Sending CV/Resume ATS results email...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-cv-results-email', {
    interviewCandidateId,
    analysisData: analysisData || null,
  });

  // Step 3: Advance to Written Test Slot Booking + send slot booking email
  console.log('Waiting before Written Test slot booking...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'Written Test Slot Booking');
  console.log('Step 3: Sending Written Test slot booking email...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-slot-booking-email', {
    interviewCandidateId,
    stageName: 'Written Test',
  });

  // Step 4: Advance to Written Test + send invitation
  console.log('Waiting before Written Test...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'Written Test');
  console.log('Step 4: Sending Written Test invitation email...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-interview-invitation', {
    interviewCandidateId,
    stageName: 'Written Test',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Step 5: Advance to Demo Slot Booking + send slot booking email
  console.log('Waiting before Demo Slot Booking...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'Demo Slot Booking');
  console.log('Step 5: Sending Demo Slot Booking email...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-slot-booking-email', {
    interviewCandidateId,
    stageName: 'Demo Round',
  });

  // Step 6: Advance to Demo Round + send demo round emails
  console.log('Waiting before Demo Round...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'Demo Round');
  console.log('Step 6: Sending Demo Round invitation emails...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-demo-round-emails', {
    interviewCandidateId,
  });

  // Step 7: Advance to Demo Feedback + send feedback request
  console.log('Waiting before Demo Feedback...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'Demo Feedback');
  console.log('Step 7: Sending Demo Feedback request email...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-demo-feedback-email', {
    interviewCandidateId,
  });

  // Step 8: Advance to HR Round Slot Booking + send slot booking email
  console.log('Waiting before HR Round Slot Booking...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'HR Round Slot Booking');
  console.log('Step 8: Sending HR Round Slot Booking email...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-slot-booking-email', {
    interviewCandidateId,
    stageName: 'HR Round',
  });

  // Step 9: Advance to HR Round + send HR round emails
  console.log('Waiting before HR Round...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'HR Round');
  console.log('Step 9: Sending HR Round invitation emails...');
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-hr-round-emails', {
    interviewCandidateId,
  });

  // Step 10: Advance to Final Review
  console.log('Waiting before Final Review...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'Final Review');
  console.log('Step 10: Final Review stage set');

  // Step 11: Advance to Offer Stage
  console.log('Waiting before Offer Stage...');
  await new Promise(resolve => setTimeout(resolve, DELAY));
  await advanceCandidateToStage(supabase, interviewCandidateId, 'Offer Stage');
  console.log('Step 11: Offer Stage set');

  // Send status notification for pipeline completion
  await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'send-status-notification', {
    interviewCandidateId,
    status: 'pipeline_completed',
    message: 'Full interview pipeline has been completed',
  });

  console.log('Full post-application pipeline completed for:', interviewCandidateId);
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

    console.log('Starting FULL post-application pipeline for:', interviewCandidateId);
    console.log('Analysis data received:', analysisData ? 'yes' : 'no');

    // MUST await the full pipeline - if we return early, the runtime kills pending setTimeout promises
    await processEmailPipeline(interviewCandidateId, analysisData);

    return new Response(JSON.stringify({
      success: true,
      message: 'Full post-application pipeline completed (all stages)',
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
