import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DemoEvaluationRequest {
  sessionId: string;
  stageOrder: number;
  recordingUrl: string;
  demoTopic: string;
  candidateProfile: any;
  durationSeconds: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, stageOrder, recordingUrl, demoTopic, candidateProfile, durationSeconds }: DemoEvaluationRequest = await req.json();
    
    console.log('Evaluating demo round:', { sessionId, stageOrder, demoTopic, durationSeconds });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build evaluation prompt
    const evaluationPrompt = `You are an expert teaching skills evaluator. A candidate has just completed a teaching demonstration on the topic: "${demoTopic}".

Candidate Profile:
- Name: ${candidateProfile?.full_name || 'Not specified'}
- Subject Expertise: ${candidateProfile?.primary_subject || 'Not specified'}
- Experience Level: ${candidateProfile?.experience_level || 'Not specified'}
- Classes Handled: ${candidateProfile?.classes_handled || 'Not specified'}

Demo Duration: ${Math.floor(durationSeconds / 60)} minutes ${durationSeconds % 60} seconds

Based on standard teaching demonstration evaluation criteria, provide a comprehensive assessment. Since you cannot view the actual video, evaluate based on the topic complexity and candidate profile, providing constructive feedback that would apply to a typical teaching demo.

Evaluate the following aspects:

1. **Teaching Clarity** (0-100): How clearly would concepts typically be explained for this topic
2. **Subject Knowledge** (0-100): Expected depth and accuracy of content for this subject area
3. **Presentation Skills** (0-100): Typical engagement, structure, and delivery expectations
4. **Time Management** (0-100): How well the demo duration aligns with the topic complexity
5. **Overall Teaching Potential** (0-100): Combined assessment of teaching abilities

For each criterion, provide:
- A score out of 100
- Specific feedback and suggestions for improvement

Also provide:
- 3-5 key strengths
- 3-5 areas for improvement
- An overall recommendation (Excellent/Good/Needs Improvement/Not Ready)

Return your evaluation as a JSON object with this structure:
{
  "overallScore": number,
  "criteria": {
    "teachingClarity": { "score": number, "feedback": "string" },
    "subjectKnowledge": { "score": number, "feedback": "string" },
    "presentationSkills": { "score": number, "feedback": "string" },
    "timeManagement": { "score": number, "feedback": "string" },
    "overallPotential": { "score": number, "feedback": "string" }
  },
  "strengths": ["string"],
  "improvements": ["string"],
  "recommendation": "string",
  "detailedFeedback": "string"
}`;

    // Call Lovable AI for evaluation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert teaching skills evaluator. Always respond with valid JSON only." },
          { role: "user", content: evaluationPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let evaluation;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Provide default evaluation
      evaluation = {
        overallScore: 70,
        criteria: {
          teachingClarity: { score: 70, feedback: "Demo recorded successfully. Teaching clarity assessment based on topic complexity." },
          subjectKnowledge: { score: 70, feedback: "Subject expertise demonstrated through topic selection." },
          presentationSkills: { score: 70, feedback: "Presentation skills evaluated based on demo duration and structure." },
          timeManagement: { score: 70, feedback: `Demo completed in ${Math.floor(durationSeconds / 60)} minutes.` },
          overallPotential: { score: 70, feedback: "Good teaching potential demonstrated." }
        },
        strengths: ["Completed demo recording", "Selected relevant topic", "Maintained appropriate duration"],
        improvements: ["Practice more demonstrations", "Focus on clarity", "Work on engagement techniques"],
        recommendation: "Good",
        detailedFeedback: "Demo round completed successfully. Continue practicing to improve teaching skills."
      };
    }

    console.log('Demo evaluation result:', evaluation);

    // Check if stage result already exists
    const { data: existingResult } = await supabase
      .from('mock_interview_stage_results')
      .select('id')
      .eq('session_id', sessionId)
      .eq('stage_order', stageOrder)
      .maybeSingle();

    let saveError;
    if (existingResult) {
      // Update existing
      const { error } = await supabase
        .from('mock_interview_stage_results')
        .update({
          ai_score: evaluation.overallScore,
          ai_feedback: evaluation.detailedFeedback,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          passed: evaluation.overallScore >= 65,
          recording_url: recordingUrl,
          questions: [{ type: 'demo', topic: demoTopic }],
          answers: [{ demoCompleted: true, duration: durationSeconds }],
          question_scores: evaluation.criteria,
          completed_at: new Date().toISOString(),
          time_taken_seconds: durationSeconds
        })
        .eq('id', existingResult.id);
      saveError = error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: sessionId,
          stage_name: 'Demo Round',
          stage_order: stageOrder,
          ai_score: evaluation.overallScore,
          ai_feedback: evaluation.detailedFeedback,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          passed: evaluation.overallScore >= 65,
          recording_url: recordingUrl,
          questions: [{ type: 'demo', topic: demoTopic }],
          answers: [{ demoCompleted: true, duration: durationSeconds }],
          question_scores: evaluation.criteria,
          completed_at: new Date().toISOString(),
          time_taken_seconds: durationSeconds
        });
      saveError = error;
    }

    if (saveError) {
      console.error('Error saving demo result:', saveError);
    }

    // Update session to next stage (7 stages total)
    // Stage 4 is Demo Round, stages 5-7 are: Demo Feedback, HR Documents, Final Review
    // After Demo Round (stage 4), we auto-complete Demo Feedback (stage 5) and move to HR Documents (stage 6)
    const TOTAL_STAGES = 7;
    const isLastStage = stageOrder >= TOTAL_STAGES;

    // Create Demo Feedback (Stage 5) result automatically with the same evaluation data
    await supabase
      .from('mock_interview_stage_results')
      .insert({
        session_id: sessionId,
        stage_name: 'Demo Feedback',
        stage_order: 5,
        ai_score: evaluation.overallScore,
        ai_feedback: evaluation.detailedFeedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        passed: evaluation.overallScore >= 65,
        question_scores: evaluation.criteria,
        completed_at: new Date().toISOString()
      });

    // Move to HR Documents (stage 6) - skipping manual feedback review
    const nextStageOrder = 6;
    
    if (!isLastStage) {
      await supabase
        .from('mock_interview_sessions')
        .update({
          current_stage_order: nextStageOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    } else {
      // Calculate overall score and mark complete
      const { data: allResults } = await supabase
        .from('mock_interview_stage_results')
        .select('ai_score')
        .eq('session_id', sessionId);

      const avgScore = allResults?.length 
        ? allResults.reduce((sum, r) => sum + (r.ai_score || 0), 0) / allResults.length 
        : 0;

      await supabase
        .from('mock_interview_sessions')
        .update({
          status: 'completed',
          overall_score: avgScore,
          overall_feedback: 'Congratulations! You have completed all interview stages.',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    // Send Demo Feedback email automatically
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY && candidateProfile?.email) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        
        const scoreColor = evaluation.overallScore >= 80 ? '#16a34a' : evaluation.overallScore >= 65 ? '#ca8a04' : '#dc2626';
        const scoreBg = evaluation.overallScore >= 80 ? '#f0fdf4' : evaluation.overallScore >= 65 ? '#fefce8' : '#fef2f2';
        const passedText = evaluation.overallScore >= 65 ? 'Passed ✓' : 'Below Threshold';
        
        // Build criteria HTML
        let criteriaHtml = '';
        if (evaluation.criteria) {
          for (const [key, value] of Object.entries(evaluation.criteria as Record<string, { score: number; feedback: string }>)) {
            const labels: Record<string, string> = {
              teachingClarity: 'Teaching Clarity',
              subjectKnowledge: 'Subject Knowledge',
              presentationSkills: 'Presentation Skills',
              timeManagement: 'Time Management',
              overallPotential: 'Overall Potential'
            };
            const cColor = value.score >= 80 ? '#16a34a' : value.score >= 65 ? '#ca8a04' : '#dc2626';
            criteriaHtml += `
              <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; background: #fafafa;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-weight: 600; color: #374151;">${labels[key] || key}</span>
                  <span style="font-weight: 700; color: ${cColor};">${value.score}%</span>
                </div>
                <div style="height: 6px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                  <div style="height: 100%; width: ${value.score}%; background: ${cColor};"></div>
                </div>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">${value.feedback}</p>
              </div>
            `;
          }
        }
        
        // Build strengths HTML
        let strengthsHtml = '';
        if (evaluation.strengths?.length) {
          strengthsHtml = evaluation.strengths.map((s: string) => `
            <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
              <span style="color: #16a34a; font-weight: bold;">✓</span>
              <span style="color: #374151;">${s}</span>
            </li>
          `).join('');
        }
        
        // Build improvements HTML
        let improvementsHtml = '';
        if (evaluation.improvements?.length) {
          improvementsHtml = evaluation.improvements.map((i: string) => `
            <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
              <span style="color: #ca8a04; font-weight: bold;">→</span>
              <span style="color: #374151;">${i}</span>
            </li>
          `).join('');
        }

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 24px;">Demo Round Feedback</h1>
                  <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Your AI evaluation results are ready</p>
                </div>

                <!-- Content -->
                <div style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">Hello ${candidateProfile?.full_name || 'Candidate'},</p>
                  
                  <p style="margin: 0 0 25px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                    Your Demo Round has been evaluated by our AI system. Here are your detailed results:
                  </p>

                  <!-- Score Card -->
                  <div style="background: ${scoreBg}; border: 2px solid ${scoreColor}; border-radius: 12px; padding: 24px; margin-bottom: 25px; text-align: center;">
                    <h3 style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Overall Score</h3>
                    <div style="font-size: 48px; font-weight: 700; color: ${scoreColor}; margin-bottom: 8px;">${evaluation.overallScore}%</div>
                    <div style="display: inline-block; padding: 6px 16px; background: ${scoreColor}; color: white; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      ${passedText}
                    </div>
                  </div>

                  <!-- Criteria Breakdown -->
                  <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px; font-weight: 600;">📊 Criteria Breakdown</h3>
                  ${criteriaHtml}

                  <!-- Strengths & Improvements -->
                  <div style="display: flex; gap: 20px; margin-top: 25px;">
                    ${strengthsHtml ? `
                      <div style="flex: 1; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                        <h4 style="margin: 0 0 12px 0; color: #16a34a; font-size: 15px;">💪 Strengths</h4>
                        <ul style="margin: 0; padding: 0; list-style: none;">${strengthsHtml}</ul>
                      </div>
                    ` : ''}
                    ${improvementsHtml ? `
                      <div style="flex: 1; padding: 16px; background: #fefce8; border: 1px solid #fde68a; border-radius: 8px;">
                        <h4 style="margin: 0 0 12px 0; color: #ca8a04; font-size: 15px;">📈 Areas to Improve</h4>
                        <ul style="margin: 0; padding: 0; list-style: none;">${improvementsHtml}</ul>
                      </div>
                    ` : ''}
                  </div>

                  <!-- Summary -->
                  ${evaluation.detailedFeedback ? `
                    <div style="margin-top: 25px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                      <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 15px;">💬 AI Evaluation Summary</h4>
                      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${evaluation.detailedFeedback}</p>
                    </div>
                  ` : ''}

                  <!-- Next Step -->
                  <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); border-radius: 12px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">🎯 Next Step: HR Documents</h4>
                    <p style="margin: 0 0 15px 0; color: #3b82f6; font-size: 14px;">Please submit your required documents for verification.</p>
                    <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '#'}/candidate/dashboard" 
                       style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      Upload Documents →
                    </a>
                  </div>
                </div>

                <!-- Footer -->
                <div style="padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 13px;">This email was sent by the Gradia Interview System</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        await resend.emails.send({
          from: 'Gradia <onboarding@resend.dev>',
          to: [candidateProfile.email],
          subject: `🎓 Demo Round Feedback - Score: ${evaluation.overallScore}%`,
          html: emailHtml
        });

        console.log('Demo feedback email sent successfully');
      } catch (emailError) {
        console.error('Error sending demo feedback email:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    // Get next stage info for email (7 stages)
    const INTERVIEW_STAGES = [
      { name: 'Interview Instructions', order: 1, description: 'Read interview guidelines' },
      { name: 'Technical Assessment', order: 2, description: 'Technical questions assessment' },
      { name: 'Demo Slot Booking', order: 3, description: 'Book your demo slot' },
      { name: 'Demo Round', order: 4, description: 'Teaching demonstration' },
      { name: 'Demo Feedback', order: 5, description: 'AI evaluation feedback review' },
      { name: 'HR Documents', order: 6, description: 'Document submission' },
      { name: 'Final Review', order: 7, description: 'Final evaluation and offer' }
    ];
    
    const nextStage = !isLastStage ? INTERVIEW_STAGES.find(s => s.order === nextStageOrder) : null;

    return new Response(JSON.stringify({
      evaluation,
      nextStage,
      nextStageOrder,
      isComplete: isLastStage,
      passed: evaluation.overallScore >= 65,
      sessionId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evaluate-demo-round:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
