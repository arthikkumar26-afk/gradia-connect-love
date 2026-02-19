import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Post-Application Pipeline
 * 
 * This function handles the timed email sequence after a job application:
 * 1. Send Instruction email immediately (marks Interview Guidelines as completed)
 * 2. Wait 5 seconds → Send CV/Resume ATS results email (marks CV/Resume as completed)
 * 3. Wait 5 seconds → Send Written Test Slot Booking email
 */
async function processEmailPipeline(interviewCandidateId: string, analysisData: any) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Step 1: Send Instruction Email immediately
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

    // Start background processing (don't await - let it run after response)
    processEmailPipeline(interviewCandidateId, analysisData).catch(err => {
      console.error('Pipeline background processing error:', err);
    });

    // Return immediately so the calling function doesn't timeout
    return new Response(JSON.stringify({
      success: true,
      message: 'Post-application pipeline started',
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
