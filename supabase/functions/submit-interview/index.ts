import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { responseId, answers, timeTaken, recordingUrl } = await req.json();

    if (!responseId || !answers) {
      throw new Error('Response ID and answers are required');
    }

    console.log('Submitting interview:', { responseId, answersCount: answers.length });

    // Get the response record with questions
    const { data: response, error: fetchError } = await supabase
      .from('interview_responses')
      .select(`
        *,
        interview_event:interview_events(
          *,
          interview_candidate:interview_candidates(
            *,
            candidate:profiles(*),
            job:jobs(*, employer:profiles!jobs_employer_id_fkey(*))
          )
        )
      `)
      .eq('id', responseId)
      .single();

    if (fetchError || !response) {
      throw new Error('Interview response not found');
    }

    if (response.completed_at) {
      throw new Error('This interview has already been submitted');
    }

    const questions = response.questions as any[];
    let correctCount = 0;

    // Calculate score
    answers.forEach((answer: number, index: number) => {
      if (questions[index] && answer === questions[index].correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Update response record
    const { error: updateError } = await supabase
      .from('interview_responses')
      .update({
        answers: answers,
        correct_answers: correctCount,
        score: score,
        time_taken_seconds: timeTaken,
        recording_url: recordingUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', responseId);

    if (updateError) {
      console.error('Error updating response:', updateError);
      throw updateError;
    }

    // Update interview event status
    await supabase
      .from('interview_events')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        ai_score: score,
        ai_feedback: {
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          percentage: score,
          timeTaken: timeTaken,
          hasRecording: !!recordingUrl,
        }
      })
      .eq('id', response.interview_event_id);

    // Update interview candidate with latest score
    const interviewCandidate = response.interview_event.interview_candidate;
    const currentStageId = response.interview_event.stage_id;
    
    // Get current stage order
    const { data: currentStage } = await supabase
      .from('interview_stages')
      .select('stage_order')
      .eq('id', currentStageId)
      .single();

    // Get next stage
    const { data: nextStage } = await supabase
      .from('interview_stages')
      .select('*')
      .gt('stage_order', currentStage?.stage_order || 0)
      .order('stage_order', { ascending: true })
      .limit(1)
      .single();

    // Auto-progress to next stage if score >= 50%
    const shouldProgress = score >= 50 && nextStage;
    
    await supabase
      .from('interview_candidates')
      .update({
        ai_score: score,
        current_stage_id: shouldProgress ? nextStage.id : currentStageId,
        ai_analysis: {
          lastInterviewScore: score,
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          completedAt: new Date().toISOString(),
          autoProgressedTo: shouldProgress ? nextStage.name : null,
        }
      })
      .eq('id', interviewCandidate.id);

    // If auto-progressed, create interview event for next stage
    if (shouldProgress) {
      console.log('Auto-progressing candidate to next stage:', nextStage.name);
      
      // Create interview event for next stage
      const { data: newEvent } = await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: interviewCandidate.id,
          stage_id: nextStage.id,
          status: 'pending',
        })
        .select()
        .single();

      // If next stage is AI automated, create invitation and send email
      if (nextStage.is_ai_automated && newEvent) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
        
        const invitationToken = crypto.randomUUID();
        const appDomain = Deno.env.get('APP_DOMAIN') || 'https://gradia.co.in';
        const interviewLink = `${appDomain}/interview?token=${invitationToken}`;
        
        const { data: invitationData } = await supabase
          .from('interview_invitations')
          .insert({
            interview_event_id: newEvent.id,
            invitation_token: invitationToken,
            expires_at: expiresAt.toISOString(),
            email_status: 'pending',
            meeting_link: interviewLink,
          })
          .select()
          .single();

        console.log('Created invitation for next AI stage:', nextStage.name);

        // Send auto-progression email to candidate
        if (resendApiKey && invitationData) {
          const candidate = interviewCandidate.candidate;
          const job = interviewCandidate.job;
          
          if (candidate?.email) {
            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Gradia Hiring <noreply@gradia.co.in>',
                  to: [candidate.email],
                  reply_to: 'support@gradia.co.in',
                  subject: `🎉 Congratulations! You've advanced to ${nextStage.name} - ${job?.job_title}`,
                  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #374151; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Congratulations!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">You've Advanced to the Next Round</p>
    </div>
    
    <div style="padding: 32px;">
      <p style="margin-top: 0;">Dear <strong>${candidate.full_name}</strong>,</p>
      
      <p>Great news! Based on your excellent performance in the previous interview round, you have been <strong>automatically advanced</strong> to the next stage.</p>
      
      <table style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 24px 0; width: 100%;">
        <tr><td style="padding: 8px 0;"><strong>Position:</strong> ${job?.job_title}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Previous Score:</strong> ${score}%</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Next Stage:</strong> ${nextStage.name}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Valid Until:</strong> ${expiresAt.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
      </table>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${interviewLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
          Start Next Interview Round
        </a>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          <strong>⚡ Quick Tips:</strong><br>
          • Ensure you have a stable internet connection<br>
          • Use a laptop/desktop with camera and screen sharing enabled<br>
          • Find a quiet, well-lit environment<br>
          • This link expires in 7 days
        </p>
      </div>
      
      <p>If the button doesn't work, copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #3b82f6; font-size: 12px;">${interviewLink}</p>
      
      <p style="margin-top: 32px;">Best of luck! 🍀</p>
      <p style="margin: 0;">The Gradia Hiring Team</p>
    </div>
    
    <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">© ${new Date().getFullYear()} Gradia. All rights reserved.</p>
      <p style="margin: 8px 0 0 0;">
        <a href="mailto:support@gradia.co.in" style="color: #3b82f6; text-decoration: none;">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>
                  `,
                  headers: {
                    'List-Unsubscribe': '<mailto:unsubscribe@gradia.co.in>',
                  },
                }),
              });
              
              // Update invitation email status
              await supabase
                .from('interview_invitations')
                .update({ 
                  email_sent_at: new Date().toISOString(),
                  email_status: 'sent' 
                })
                .eq('id', invitationData.id);
              
              console.log('Auto-progression email sent to candidate:', candidate.email);
            } catch (emailError) {
              console.error('Failed to send auto-progression email:', emailError);
              
              await supabase
                .from('interview_invitations')
                .update({ email_status: 'failed' })
                .eq('id', invitationData.id);
            }
          }
        }
      }
    }

    // Send notification email to employer
    if (resendApiKey) {
      const employer = interviewCandidate.job?.employer;
      const candidate = interviewCandidate.candidate;
      
      if (employer?.email) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Gradia Hiring <noreply@gradia.co.in>',
              to: [employer.email],
              reply_to: 'support@gradia.co.in',
              subject: `Interview completed: ${candidate.full_name} scored ${score}%${shouldProgress ? ' - Auto-progressed to ' + nextStage.name : ''}`,
              html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; padding: 20px;">
  <h2 style="color: #111827; margin-bottom: 16px;">Interview Completed</h2>
  
  <p><strong>${candidate.full_name}</strong> has completed their interview for <strong>${interviewCandidate.job?.job_title}</strong>.</p>
  
  <table style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; width: 100%;">
    <tr><td><strong>Score:</strong> ${score}%</td></tr>
    <tr><td><strong>Correct Answers:</strong> ${correctCount}/${questions.length}</td></tr>
    <tr><td><strong>Time Taken:</strong> ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s</td></tr>
    ${recordingUrl ? `<tr><td><strong>Recording:</strong> Available in dashboard</td></tr>` : ''}
  </table>
  
  ${shouldProgress ? `
  <div style="background: #d1fae5; border: 1px solid #10b981; padding: 16px; border-radius: 6px; margin: 20px 0;">
    <p style="margin: 0; color: #065f46;"><strong>✓ Auto-Progressed:</strong> Candidate has been automatically moved to <strong>${nextStage.name}</strong> based on their score.</p>
  </div>
  ` : score < 50 ? `
  <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e;"><strong>⚠ Low Score:</strong> Candidate scored below 50%. Manual review recommended before progressing.</p>
  </div>
  ` : ''}
  
  <p>Log in to your employer dashboard to review the detailed results${recordingUrl ? ' and watch the recording' : ''}.</p>
  
  <p style="margin-top: 24px;">Best regards,<br>Gradia Hiring Team</p>
</body>
</html>
              `,
              headers: {
                'List-Unsubscribe': '<mailto:unsubscribe@gradia.co.in>',
              },
            }),
          });
          console.log('Employer notification sent');
        } catch (emailError) {
          console.error('Failed to send employer notification:', emailError);
        }
      }
    }

    console.log('Interview submitted successfully, score:', score);

    // Return results with correct answers for display
    const results = questions.map((q: any, i: number) => ({
      question: q.question,
      options: q.options,
      userAnswer: answers[i],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      isCorrect: answers[i] === q.correctAnswer,
    }));

    return new Response(JSON.stringify({
      success: true,
      score,
      correctCount,
      totalQuestions: questions.length,
      results,
      timeTaken,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error submitting interview:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
