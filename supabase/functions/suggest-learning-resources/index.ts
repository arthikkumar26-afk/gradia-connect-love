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
    const { stageResults, candidateProfile } = await req.json();

    if (!stageResults || !Array.isArray(stageResults) || stageResults.length === 0) {
      return new Response(
        JSON.stringify({ error: "Stage results are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Aggregate improvements and scores
    const improvements = stageResults.flatMap((r: any) => r.improvements || []);
    const strengths = stageResults.flatMap((r: any) => r.strengths || []);
    const avgScore = stageResults
      .filter((r: any) => r.ai_score != null)
      .reduce((sum: number, r: any, _: number, arr: any[]) => sum + (r.ai_score || 0) / arr.length, 0);

    const prompt = `Based on the following mock interview performance, suggest personalized learning resources across three categories: Mentors, EdTech Platforms/Courses, and Institutions/Universities.

Candidate Profile:
- Role: ${candidateProfile?.preferred_role || "Not specified"}
- Subject: ${candidateProfile?.primary_subject || "Not specified"}
- Experience: ${candidateProfile?.experience_level || "Not specified"}
- Industry: ${candidateProfile?.segment || candidateProfile?.category || "General"}

Mock Interview Performance:
- Average Score: ${avgScore.toFixed(1)}%
- Areas for Improvement: ${improvements.length > 0 ? [...new Set(improvements)].join(", ") : "General improvement needed"}
- Strengths: ${strengths.length > 0 ? [...new Set(strengths)].join(", ") : "None identified"}

Provide recommendations that are specific, actionable, and relevant to the candidate's weak areas and career goals.`;

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
            content: "You are a career development advisor specializing in recommending mentors, online learning platforms, and educational institutions to help candidates improve their skills based on their interview performance."
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_learning_resources",
              description: "Return personalized learning resource suggestions across mentors, edtech, and institutions",
              parameters: {
                type: "object",
                properties: {
                  mentors: {
                    type: "array",
                    description: "Suggested mentor profiles to learn from",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Mentor name" },
                        expertise: { type: "string", description: "Area of expertise" },
                        reason: { type: "string", description: "Why this mentor helps the candidate" },
                        platform: { type: "string", description: "Platform where mentor is available (e.g., Skillory, Topmate, MentorCruise)" },
                        specialization: { type: "string", description: "Specific skill area" }
                      },
                      required: ["name", "expertise", "reason", "platform", "specialization"],
                      additionalProperties: false
                    }
                  },
                  edtechCourses: {
                    type: "array",
                    description: "Recommended courses from edtech platforms",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Course title" },
                        platform: { type: "string", description: "Platform name (Coursera, Udemy, Skillory, NPTEL, etc.)" },
                        description: { type: "string", description: "Why this course helps" },
                        skillArea: { type: "string", description: "Skill area it improves" },
                        duration: { type: "string", description: "Estimated duration" },
                        level: { type: "string", description: "Beginner, Intermediate, or Advanced" }
                      },
                      required: ["title", "platform", "description", "skillArea", "duration", "level"],
                      additionalProperties: false
                    }
                  },
                  institutions: {
                    type: "array",
                    description: "Recommended institutions for deeper learning",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Institution name" },
                        type: { type: "string", description: "University, Training Center, Online Academy, etc." },
                        program: { type: "string", description: "Specific program or certification" },
                        reason: { type: "string", description: "Why this institution is recommended" },
                        location: { type: "string", description: "Location or Online" }
                      },
                      required: ["name", "type", "program", "reason", "location"],
                      additionalProperties: false
                    }
                  },
                  overallAdvice: {
                    type: "string",
                    description: "Brief overall career development advice based on the performance"
                  }
                },
                required: ["mentors", "edtechCourses", "institutions", "overallAdvice"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_learning_resources" } }
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
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      const suggestions = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(suggestions),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        mentors: [], 
        edtechCourses: [], 
        institutions: [],
        overallAdvice: "Keep practicing to improve your skills!" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error suggesting learning resources:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
