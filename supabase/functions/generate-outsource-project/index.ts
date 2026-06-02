import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, skills, duration, budget_min, budget_max, deliverables } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!title && !description) {
      return new Response(JSON.stringify({ error: "Provide at least a title or description" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are helping an employer post a freelance outsource project. Based on the partial details below, generate a complete, professional project brief.

Partial details:
- Title: ${title || "(not provided)"}
- Description: ${description || "(not provided)"}
- Skills: ${skills || "(not provided)"}
- Duration: ${duration || "(not provided)"}
- Budget Min (INR): ${budget_min || "(not provided)"}
- Budget Max (INR): ${budget_max || "(not provided)"}
- Deliverables: ${deliverables || "(not provided)"}

Return ONLY valid JSON (no markdown) with these fields:
- title: refined concise project title (max 80 chars)
- description: 3-5 sentence detailed project description covering scope, goals, expectations
- skills: array of 4-8 relevant technical/professional skills
- duration: realistic duration string (e.g. "2 weeks", "1 month")
- budget_min: integer INR (realistic Indian freelance market rate)
- budget_max: integer INR (greater than budget_min)
- deliverables: array of 3-6 concrete deliverables

Respect any values the user already provided; only fill in / improve the missing or weak fields.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You generate professional freelance project briefs. Always return valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-outsource-project error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
