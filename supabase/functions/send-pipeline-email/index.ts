import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * PIPELINE EMAIL GATEWAY
 * 
 * Single entry point for ALL pipeline emails.
 * Validates: stage order, locking, idempotency, sequential flow.
 * 
 * Supported email types:
 * - slot_booking: Send slot booking email
 * - feedback_request: Send feedback request email  
 * - interview_invitation: Send interview invitation (Written Test only)
 * - instruction: Send instruction email
 * - cv_results: Send CV results email
 */

// The 16-stage pipeline order
const PIPELINE_STAGES = [
  'Interview Guidelines',
  'CV/Resume',
  'Written Test Slot Booking',
  'Written Test',
  'Segment Round Slot Booking',
  'Segment Feedback',
  'Admin & Academic Round Slot Booking',
  'Admin & Academic Feedback',
  'Core Team Round Slot Booking',
  'Core Team Feedback',
  'Management Round Slot Booking',
  'Management Round Feedback',
  'HR Round Slot Booking',
  'HR Feedback',
  'Final Review',
  'Offer Stage',
];

interface PipelineEmailRequest {
  interviewCandidateId: string;
  stageName: string;
  emailType: string; // 'slot_booking' | 'feedback_request' | 'interview_invitation' | 'instruction' | 'cv_results'
  triggerSource: string;
  // Optional payload for specific email types
  feedbackType?: string;
  scheduledDate?: string;
  meetingLink?: string;
  analysisData?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PipelineEmailRequest = await req.json();
    const { interviewCandidateId, stageName, emailType, triggerSource, feedbackType, scheduledDate, meetingLink, analysisData } = body;

    console.log(`[PIPELINE EMAIL GATEWAY] Request:`, { interviewCandidateId, stageName, emailType, triggerSource });

    // ─── VALIDATION 1: Get candidate's current stage ───
    const { data: candidate, error: candidateErr } = await supabase
      .from('interview_candidates')
      .select(`
        *,
        current_stage:interview_stages!interview_candidates_current_stage_id_fkey(id, name, stage_order),
        candidate:profiles(full_name, email),
        job:jobs(*, employer_id)
      `)
      .eq('id', interviewCandidateId)
      .single();

    if (candidateErr || !candidate) {
      return jsonResponse({ error: 'Candidate not found', blocked: true }, 404);
    }

    const currentStageName = (candidate.current_stage as any)?.name;
    const currentStageOrder = (candidate.current_stage as any)?.stage_order ?? 0;

    // ─── VALIDATION 2: Check if stage is valid for current position ───
    // Get the requested stage order from the pipeline
    const requestedStageIndex = PIPELINE_STAGES.indexOf(stageName);
    const currentStageIndex = PIPELINE_STAGES.indexOf(currentStageName);
    
    // For job-specific pipelines, also check interview_stages table
    const { data: requestedStageData } = await supabase
      .from('interview_stages')
      .select('id, stage_order')
      .eq('name', stageName)
      .single();

    const requestedStageOrder = requestedStageData?.stage_order ?? requestedStageIndex;

    // Allow emails only for current stage or one stage ahead (for pre-sending)
    if (requestedStageOrder < currentStageOrder - 1) {
      console.log(`[BLOCKED] Backward stage email: requested="${stageName}" (order ${requestedStageOrder}), current="${currentStageName}" (order ${currentStageOrder})`);
      return jsonResponse({
        blocked: true,
        reason: 'backward_stage',
        message: `Cannot send email for "${stageName}" - candidate is already at "${currentStageName}"`,
      });
    }

    // ─── VALIDATION 3: Check if this email was already sent (idempotency) ───
    const { data: existingLog } = await supabase
      .from('pipeline_email_log')
      .select('*')
      .eq('interview_candidate_id', interviewCandidateId)
      .eq('stage_name', stageName)
      .eq('email_type', emailType)
      .single();

    if (existingLog?.email_sent) {
      console.log(`[BLOCKED] Email already sent: ${emailType} for stage "${stageName}"`);
      return jsonResponse({
        blocked: true,
        reason: 'already_sent',
        message: `Email "${emailType}" for stage "${stageName}" was already sent at ${existingLog.sent_at}`,
      });
    }

    // ─── VALIDATION 4: Check if stage is locked ───
    if (existingLog?.stage_locked) {
      console.log(`[BLOCKED] Stage locked: "${stageName}"`);
      return jsonResponse({
        blocked: true,
        reason: 'stage_locked',
        message: `Stage "${stageName}" is locked. No more emails can be sent.`,
      });
    }

    // ─── VALIDATION 5: Suppress non-critical candidate-facing emails ───
    // Candidates manage most steps from their dashboard pipeline tab, so we
    // suppress generic "slot booking" reminder emails. However, the Written
    // Test invitation email IS sent because candidates explicitly expect to
    // receive a link/email after booking their Written Test slot.
    // Other 'interview_invitation' emails (live rounds) remain suppressed —
    // those are scheduled by the employer and announced via the dashboard.
    const SUPPRESSED_EMAIL_TYPES = ['slot_booking'];
    const isWrittenTestInvitation =
      emailType === 'interview_invitation' &&
      typeof stageName === 'string' &&
      stageName.toLowerCase().includes('written test');
    if (
      emailType === 'interview_invitation' &&
      !isWrittenTestInvitation
    ) {
      console.log(`[SUPPRESSED] interview_invitation for non-written-test stage "${stageName}" - candidates use dashboard pipeline instead`);
      return jsonResponse({
        blocked: false,
        suppressed: true,
        reason: 'dashboard_driven',
        message: `Email "${emailType}" suppressed for stage "${stageName}" — candidates manage this from their Interview Pipeline dashboard`,
        emailType,
        stageName,
      });
    }
    if (SUPPRESSED_EMAIL_TYPES.includes(emailType)) {
      console.log(`[SUPPRESSED] Email type "${emailType}" for stage "${stageName}" - candidates use dashboard pipeline instead`);
      return jsonResponse({
        blocked: false,
        suppressed: true,
        reason: 'dashboard_driven',
        message: `Email "${emailType}" suppressed — candidates manage this from their Interview Pipeline dashboard`,
        emailType,
        stageName,
      });
    }

    // ─── VALIDATION 6: Check previous stage completion (sequential flow) ───
    if (requestedStageIndex > 0) {
      const previousStageName = PIPELINE_STAGES[requestedStageIndex - 1];
      // Check if previous stage has a completed event
      const { data: prevStageData } = await supabase
        .from('interview_stages')
        .select('id')
        .eq('name', previousStageName)
        .single();

      if (prevStageData) {
        const { data: prevEvents } = await supabase
          .from('interview_events')
          .select('status')
          .eq('interview_candidate_id', interviewCandidateId)
          .eq('stage_id', prevStageData.id)
          .in('status', ['passed', 'completed', 'pending'])
          .limit(1);

        // Allow if previous stage has at least one event (pending counts for auto-advanced stages)
        if (!prevEvents || prevEvents.length === 0) {
          // Special exceptions: Interview Guidelines and CV/Resume are auto-processed
          const autoProcessedStages = ['Interview Guidelines', 'CV/Resume', 'Written Test Slot Booking'];
          if (!autoProcessedStages.includes(stageName)) {
            console.log(`[BLOCKED] Previous stage "${previousStageName}" not completed`);
            return jsonResponse({
              blocked: true,
              reason: 'previous_stage_incomplete',
              message: `Previous stage "${previousStageName}" must be completed before sending emails for "${stageName}"`,
            });
          }
        }
      }
    }

    // ─── ALL VALIDATIONS PASSED - Create/Update log and send email ───
    const resendEventId = `${interviewCandidateId}_${stageName}_${emailType}`.replace(/\s+/g, '_');

    // Upsert the log entry
    await supabase
      .from('pipeline_email_log')
      .upsert({
        interview_candidate_id: interviewCandidateId,
        stage_name: stageName,
        email_type: emailType,
        stage_order: requestedStageOrder,
        email_sent: false,
        trigger_source: triggerSource,
        resend_event_id: resendEventId,
      }, { onConflict: 'interview_candidate_id,stage_name,email_type' });

    // ─── DISPATCH TO APPROPRIATE EMAIL FUNCTION ───
    let emailResult: any = null;
    let emailError: string | null = null;

    try {
      // Small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 1000));

      switch (emailType) {
        case 'slot_booking': {
          emailResult = await callFunction(supabaseUrl, supabaseServiceKey, 'send-slot-booking-email', {
            interviewCandidateId,
            stageName,
          });
          break;
        }
        case 'feedback_request': {
          const fn = feedbackType === 'hr' ? 'send-hr-feedback-email' : 'send-demo-feedback-email';
          emailResult = await callFunction(supabaseUrl, supabaseServiceKey, fn, {
            interviewCandidateId,
            feedbackType: feedbackType || 'demo',
          });
          break;
        }
        case 'interview_invitation': {
          emailResult = await callFunction(supabaseUrl, supabaseServiceKey, 'send-interview-invitation', {
            interviewCandidateId,
            stageName,
            scheduledDate,
            meetingLink,
          });
          break;
        }
        case 'instruction': {
          emailResult = await callFunction(supabaseUrl, supabaseServiceKey, 'send-instruction-email', {
            interviewCandidateId,
          });
          break;
        }
        case 'cv_results': {
          emailResult = await callFunction(supabaseUrl, supabaseServiceKey, 'send-cv-results-email', {
            interviewCandidateId,
            analysisData,
          });
          break;
        }
        default:
          throw new Error(`Unknown email type: ${emailType}`);
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Unknown email error';
      console.error(`[EMAIL ERROR] ${emailType} for "${stageName}":`, emailError);
    }

    // ─── UPDATE LOG: Mark as sent or failed ───
    const updateData: any = {
      email_sent: !emailError,
      sent_at: emailError ? null : new Date().toISOString(),
      error_message: emailError,
      trigger_source: triggerSource,
    };

    await supabase
      .from('pipeline_email_log')
      .update(updateData)
      .eq('interview_candidate_id', interviewCandidateId)
      .eq('stage_name', stageName)
      .eq('email_type', emailType);

    // ─── LOCK PREVIOUS STAGES ───
    // Lock all stages before the current one to prevent backward emails
    if (!emailError) {
      const stagesToLock = PIPELINE_STAGES.slice(0, Math.max(0, requestedStageIndex));
      if (stagesToLock.length > 0) {
        await supabase
          .from('pipeline_email_log')
          .update({ stage_locked: true })
          .eq('interview_candidate_id', interviewCandidateId)
          .in('stage_name', stagesToLock);
      }
    }

    console.log(`[PIPELINE EMAIL] ${emailError ? 'FAILED' : 'SUCCESS'}: ${emailType} for "${stageName}" | source: ${triggerSource}`);

    return jsonResponse({
      success: !emailError,
      blocked: false,
      emailType,
      stageName,
      triggerSource,
      resendEventId,
      error: emailError,
      emailResult,
    });

  } catch (error) {
    console.error('[PIPELINE EMAIL GATEWAY ERROR]:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

async function callFunction(supabaseUrl: string, serviceKey: string, functionName: string, body: any) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return await response.json();
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' },
  });
}
