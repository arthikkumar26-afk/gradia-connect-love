import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testResults, candidateProfile } = await req.json();

    if (!testResults) {
      return new Response(
        JSON.stringify({ error: "Test results are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { score, total_questions, correct_answers, questions, answers } = testResults;

    // Build context about the test performance
    let weakAreas: string[] = [];
    if (questions && answers) {
      try {
        const questionsArray = Array.isArray(questions) ? questions : [];
        const answersArray = Array.isArray(answers) ? answers : [];
        
        questionsArray.forEach((q: any, idx: number) => {
          const answer = answersArray[idx];
          if (answer && !answer.isCorrect) {
            weakAreas.push(q.category || q.topic || "General knowledge");
          }
        });
      } catch (e) {
        console.error("Error parsing questions/answers:", e);
      }
    }

    const prompt = `Based on the following mock test results, suggest 3-5 specific online courses or learning resources to help improve the candidate's skills.

Test Results:
- Score: ${score?.toFixed(0) || 0}%
- Correct Answers: ${correct_answers || 0} out of ${total_questions || 0}
${weakAreas.length > 0 ? `- Weak Areas: ${[...new Set(weakAreas)].join(", ")}` : ""}
${candidateProfile?.preferred_role ? `- Desired Role: ${candidateProfile.preferred_role}` : ""}
${candidateProfile?.primary_subject ? `- Primary Subject: ${candidateProfile.primary_subject}` : ""}

Return exactly 3-5 course suggestions. Each course should include:
1. Course title (be specific, name real courses from Coursera, Udemy, LinkedIn Learning, edX, etc.)
2. Platform name
3. Brief description of why this course helps
4. Skill area it improves
5. Estimated duration

Focus on courses that address the weak areas identified in the test.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a career coach and learning advisor. Suggest specific, actionable online courses to help candidates improve their skills based on their test performance. Be practical and recommend real courses from popular platforms."
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_courses",
              description: "Return course suggestions based on test results",
              parameters: {
                type: "object",
                properties: {
                  courses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Course title" },
                        platform: { type: "string", description: "Platform name (Coursera, Udemy, etc.)" },
                        description: { type: "string", description: "Why this course helps" },
                        skillArea: { type: "string", description: "Skill area it improves" },
                        duration: { type: "string", description: "Estimated duration" },
                        url: { type: "string", description: "URL to the course (if known)" }
                      },
                      required: ["title", "platform", "description", "skillArea", "duration"],
                      additionalProperties: false
                    }
                  },
                  overallAdvice: {
                    type: "string",
                    description: "Brief overall advice based on the test performance"
                  }
                },
                required: ["courses", "overallAdvice"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_courses" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      const suggestions = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(suggestions),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback if no tool call
    return new Response(
      JSON.stringify({ 
        courses: [], 
        overallAdvice: "Keep practicing to improve your skills!" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error suggesting courses:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
