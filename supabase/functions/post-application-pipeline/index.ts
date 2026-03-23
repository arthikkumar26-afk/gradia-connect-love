import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Post-Application Pipeline
 * 
 * This function handles the full automated email + stage advancement sequence:
 * 1. Send Instruction email → advance to CV/Resume
 * 2. Wait 5s → Send CV/Resume ATS results email → advance to Written Test Slot Booking
 * 3. Wait 5s → Send Written Test Slot Booking email
 */
async function processEmailPipeline(interviewCandidateId: string, analysisData: any) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: Send Instruction Email (also advances Interview Guidelines → CV/Resume internally)
  console.log('Step 1: Sending instruction email...');
  try {
    const instructionResponse = await fetch(`${supabaseUrl}/functions/v1/send-instruction-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ interviewCandidateId }),
    });
    const instructionResult = await instructionResponse.json();
    console.log('Instruction email result:', instructionResult);
  } catch (err) {
    console.error('Failed to send instruction email:', err);
  }

  // Step 2: Wait 5 seconds, then send CV/Resume ATS results email
  // The send-cv-results-email function also advances to Written Test Slot Booking
  console.log('Waiting 5 seconds before CV results email...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Step 2: Sending CV/Resume ATS results email...');
  try {
    const cvResponse = await fetch(`${supabaseUrl}/functions/v1/send-cv-results-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        interviewCandidateId,
        analysisData: analysisData || null,
      }),
    });
    const cvResult = await cvResponse.json();
    console.log('CV results email result:', cvResult);
  } catch (err) {
    console.error('Failed to send CV results email:', err);
  }

  // Step 3: Wait 5 seconds, then send Written Test Slot Booking email
  console.log('Waiting 5 seconds before Written Test slot booking email...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Ensure candidate is on Written Test Slot Booking stage before sending
  const { data: slotStage } = await supabase
    .from('interview_stages')
    .select('id, stage_order')
    .eq('name', 'Written Test Slot Booking')
    .single();

  if (slotStage) {
    // Verify candidate stage and advance if needed
    const { data: ic } = await supabase
      .from('interview_candidates')
      .select('current_stage_id, current_stage:interview_stages!interview_candidates_current_stage_id_fkey(stage_order)')
      .eq('id', interviewCandidateId)
      .single();

    const currentOrder = (ic?.current_stage as any)?.stage_order ?? -1;
    if (currentOrder < slotStage.stage_order) {
      await supabase
        .from('interview_candidates')
        .update({ current_stage_id: slotStage.id })
        .eq('id', interviewCandidateId);
      console.log('Advanced candidate to Written Test Slot Booking stage');
    }
  }

  console.log('Step 3: Sending Written Test slot booking email...');
  try {
    const slotResponse = await fetch(`${supabaseUrl}/functions/v1/send-slot-booking-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interviewCandidateId,
        stageName: 'Written Test',
      }),
    });
    const slotResult = await slotResponse.json();
    console.log('Slot booking email result:', slotResult);
  } catch (err) {
    console.error('Failed to send slot booking email:', err);
  }

  console.log('Post-application pipeline completed for:', interviewCandidateId);
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

    console.log('Starting post-application pipeline for:', interviewCandidateId);
    console.log('Analysis data received:', analysisData ? 'yes' : 'no');

    // MUST await the full pipeline - if we return early, the runtime kills pending setTimeout promises
    await processEmailPipeline(interviewCandidateId, analysisData);

    return new Response(JSON.stringify({
      success: true,
      message: 'Post-application pipeline completed',
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
