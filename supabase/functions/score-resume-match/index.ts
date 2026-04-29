import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  resumeUrl: string;
  jobContext?: string;       // Employer name + role/domain hint
  candidateRow?: Record<string, string>; // optional row context (skills, experience, etc.)
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { resumeUrl, jobContext = "", candidateRow = {} } = (await req.json()) as Body;
    if (!resumeUrl) {
      return new Response(JSON.stringify({ error: "resumeUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch resume binary -> base64
    const resp = await fetch(resumeUrl);
    if (!resp.ok) throw new Error(`Failed to download resume: ${resp.status}`);
    const buf = new Uint8Array(await resp.arrayBuffer());
    let base64 = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      base64 += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    }
    base64 = btoa(base64);
    const mimeType = resumeUrl.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : resumeUrl.toLowerCase().endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";

    const rowSummary = Object.entries(candidateRow)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const systemPrompt = `You are an expert recruiter scoring a resume against a target role.
Output ONLY a JSON object via the score_match tool. The score is the candidate's overall fit (0-100):
- 90-100: exceptional fit (most skills + experience matched)
- 75-89: strong fit
- 60-74: moderate fit, partial match
- 40-59: weak fit, missing key requirements
- 0-39: poor fit / wrong domain
Be strict. Consider skills, years of experience, domain, and seniority.`;

    const userPrompt = `Target role context:
${jobContext || "General professional fit"}

Recruiter-entered details for this candidate:
${rowSummary || "(none provided)"}

Score the attached resume against the target role context above. Return a single integer 0-100 plus a short reason.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_match",
            description: "Return the resume-to-role match score.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "integer", minimum: 0, maximum: 100 },
                reason: { type: "string" },
              },
              required: ["score", "reason"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_match" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let score = 0;
    let reason = "";
    if (args) {
      try {
        const parsed = JSON.parse(args);
        score = Math.max(0, Math.min(100, parseInt(parsed.score ?? 0, 10) || 0));
        reason = String(parsed.reason || "");
      } catch (e) {
        console.error("Failed to parse tool args:", e, args);
      }
    }

    return new Response(JSON.stringify({ score, reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-resume-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
