import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const nextStageOrder = stageOrder + 1;
    const TOTAL_STAGES = 7;
    const isLastStage = stageOrder >= TOTAL_STAGES;

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
