import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, category, difficulty, designBase64, briefText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (action === "generate_brief") {
      const categoryText = category || "general";
      const difficultyText = difficulty || "intermediate";

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
              content: `You are a senior creative director generating design briefs for graphic designers. Return JSON only.`
            },
            {
              role: "user",
              content: `Generate a ${difficultyText} graphic design challenge brief for category: ${categoryText}.
              
Return a JSON object with these fields:
- title: Challenge title (creative & specific)
- description: 2-3 sentence brief explaining what to design
- requirements: Array of 4-6 specific design requirements
- dimensions: Recommended canvas size (e.g., "1920x1080px")
- colorScheme: Suggested color palette theme (not exact colors)
- targetAudience: Who the design is for
- deliverables: What files/formats to submit
- timeLimit: Time in minutes (15-45 based on difficulty)
- evaluationCriteria: Array of 5 criteria that will be scored (each with name and weight out of 100)

Make it realistic and industry-relevant. Be specific about the design task.`
            }
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_design_brief",
              description: "Create a structured design brief",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  requirements: { type: "array", items: { type: "string" } },
                  dimensions: { type: "string" },
                  colorScheme: { type: "string" },
                  targetAudience: { type: "string" },
                  deliverables: { type: "string" },
                  timeLimit: { type: "number" },
                  evaluationCriteria: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        weight: { type: "number" }
                      },
                      required: ["name", "weight"]
                    }
                  }
                },
                required: ["title", "description", "requirements", "dimensions", "colorScheme", "targetAudience", "deliverables", "timeLimit", "evaluationCriteria"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "create_design_brief" } }
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      const brief = toolCall ? JSON.parse(toolCall.function.arguments) : null;

      return new Response(JSON.stringify({ brief }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "evaluate_design") {
      if (!designBase64 || !briefText) {
        return new Response(JSON.stringify({ error: "Missing design image or brief" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert graphic design evaluator. Analyze the submitted design against the brief and provide detailed scoring and feedback.`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Evaluate this graphic design submission against the following brief:\n\n${briefText}\n\nProvide detailed evaluation with scores for each criterion (0-100), specific strengths, areas for improvement, and an overall score. Be constructive but honest.`
                },
                {
                  type: "image_url",
                  image_url: { url: designBase64 }
                }
              ]
            }
          ],
          tools: [{
            type: "function",
            function: {
              name: "evaluate_design",
              description: "Evaluate a graphic design submission",
              parameters: {
                type: "object",
                properties: {
                  overallScore: { type: "number", description: "Overall score 0-100" },
                  grade: { type: "string", enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"] },
                  criteriaScores: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        score: { type: "number" },
                        feedback: { type: "string" }
                      },
                      required: ["name", "score", "feedback"]
                    }
                  },
                  strengths: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } },
                  overallFeedback: { type: "string" },
                  industryReadiness: { type: "string", description: "Assessment of industry readiness" },
                  suggestedCourses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        reason: { type: "string" }
                      },
                      required: ["title", "reason"]
                    }
                  }
                },
                required: ["overallScore", "grade", "criteriaScores", "strengths", "improvements", "overallFeedback", "industryReadiness", "suggestedCourses"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "evaluate_design" } }
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      const evaluation = toolCall ? JSON.parse(toolCall.function.arguments) : null;

      return new Response(JSON.stringify({ evaluation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("graphic-design-challenge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
