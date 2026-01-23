import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, answers, transcripts } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session with questions
    const { data: session, error: sessionError } = await supabase
      .from("ai_interview_sessions")
      .select(`
        *,
        jobs:job_id (
          job_title,
          skills,
          requirements
        )
      `)
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found");
    }

    const questions = session.questions as any[];
    const job = session.jobs;

    // Build evaluation prompt
    const qaList = questions.map((q, idx) => {
      const answer = answers[idx] || transcripts?.[idx] || "No answer provided";
      return `
Question ${idx + 1}: ${q.question}
Category: ${q.category}
Difficulty: ${q.difficulty}
Key Points Expected: ${q.keyPoints?.join(", ") || "N/A"}
Candidate's Answer: ${answer}
`;
    }).join("\n---\n");

    const systemPrompt = `You are an expert technical interviewer evaluating candidate responses for a ${job?.job_title || "technical"} position.

Required Skills: ${job?.skills?.join(", ") || "N/A"}

Evaluate each answer on:
1. Technical accuracy (0-10)
2. Clarity of explanation (0-10)
3. Depth of understanding (0-10)
4. Communication skills (0-10)

Return ONLY a valid JSON object in this exact format:
{
  "evaluations": [
    {
      "questionIndex": 0,
      "scores": {
        "technicalAccuracy": 8,
        "clarity": 7,
        "depth": 8,
        "communication": 9
      },
      "feedback": "Brief feedback on this answer",
      "strengths": ["strength 1"],
      "improvements": ["improvement 1"]
    }
  ],
  "overallScore": 75,
  "overallFeedback": "Overall assessment of the candidate",
  "recommendation": "strongly_recommend|recommend|maybe|not_recommend",
  "topStrengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Evaluate these interview responses:\n\n${qaList}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    let evaluation;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      evaluation = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse evaluation:", parseError, content);
      evaluation = {
        evaluations: [],
        overallScore: 50,
        overallFeedback: "Evaluation completed. Please review the recording for detailed assessment.",
        recommendation: "maybe",
        topStrengths: [],
        areasForImprovement: []
      };
    }

    // Update session with evaluation
    await supabase
      .from("ai_interview_sessions")
      .update({
        answers: answers || transcripts,
        ai_evaluations: evaluation.evaluations,
        overall_score: evaluation.overallScore,
        overall_feedback: evaluation.overallFeedback,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ evaluation }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error evaluating interview:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
