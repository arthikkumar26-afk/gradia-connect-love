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
    await supabase
      .from('interview_candidates')
      .update({
        ai_score: score,
        ai_analysis: {
          lastInterviewScore: score,
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          completedAt: new Date().toISOString(),
        }
      })
      .eq('id', interviewCandidate.id);

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
              subject: `Interview completed: ${candidate.full_name} scored ${score}%`,
              html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; padding: 20px;">
  <h2 style="color: #111827; margin-bottom: 16px;">Interview Completed</h2>
  
  <p><strong>${candidate.full_name}</strong> has completed their first round interview for <strong>${interviewCandidate.job?.job_title}</strong>.</p>
  
  <table style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; width: 100%;">
    <tr><td><strong>Score:</strong> ${score}%</td></tr>
    <tr><td><strong>Correct Answers:</strong> ${correctCount}/${questions.length}</td></tr>
    <tr><td><strong>Time Taken:</strong> ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s</td></tr>
    ${recordingUrl ? `<tr><td><strong>Recording:</strong> Available in dashboard</td></tr>` : ''}
  </table>
  
  <p>Log in to your employer dashboard to review the detailed results and ${recordingUrl ? 'watch the recording' : 'proceed with next steps'}.</p>
  
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
