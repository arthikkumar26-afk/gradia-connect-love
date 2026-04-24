import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { safeErrorMessage } from "../_shared/safeError.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, existingStages } = await req.json();
    
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an interview pipeline stage configuration expert. Given a user's description of what an interview stage should do, generate the stage configuration.

Return a JSON object with these fields:
- name: Short stage name (e.g., "Technical Coding Test", "Group Discussion", "Portfolio Review")
- description: Brief description of what happens in this stage
- isAutomated: boolean - true if AI can handle this stage (like MCQ tests, resume screening, coding tests), false if it needs human involvement (like in-person interviews, group discussions, HR rounds)
- automationConfig: object describing backend automation:
  - triggerType: "auto_advance" | "manual" | "scheduled" | "slot_booking"
  - emailTemplate: what kind of email to send (invitation, result, feedback request)
  - evaluationType: "ai_scoring" | "human_feedback" | "test_based" | "demo_based" | "none"
  - duration: estimated duration in minutes
  - instructions: brief instructions for candidates

Consider existing stages to avoid duplicates and ensure logical flow.

Existing stages: ${JSON.stringify(existingStages || [])}

Respond ONLY with valid JSON, no markdown or extra text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "configure_stage",
            description: "Configure an interview pipeline stage",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Stage name" },
                description: { type: "string", description: "Stage description" },
                isAutomated: { type: "boolean", description: "Whether AI handles this stage" },
                automationConfig: {
                  type: "object",
                  properties: {
                    triggerType: { type: "string", enum: ["auto_advance", "manual", "scheduled", "slot_booking"] },
                    emailTemplate: { type: "string", description: "Type of email to send" },
                    evaluationType: { type: "string", enum: ["ai_scoring", "human_feedback", "test_based", "demo_based", "none"] },
                    duration: { type: "number", description: "Duration in minutes" },
                    instructions: { type: "string", description: "Instructions for candidates" }
                  },
                  required: ["triggerType", "evaluationType"]
                }
              },
              required: ["name", "description", "isAutomated", "automationConfig"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "configure_stage" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let stageConfig;
    if (toolCall?.function?.arguments) {
      stageConfig = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content directly
      const content = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        stageConfig = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    return new Response(JSON.stringify(stageConfig), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
