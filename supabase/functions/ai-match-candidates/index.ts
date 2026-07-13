import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CandidateLite {
  id: string;
  role?: string | null;
  subject?: string | null;
  experience?: string | null;
  qualification?: string | null;
  location?: string | null;
  category?: string | null;
  segment?: string | null;
  languages?: string[] | null;
}

interface Body {
  jobDescription: string;
  candidates: CandidateLite[];
  topK?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { jobDescription, candidates, topK = 30 } = (await req.json()) as Body;
    if (!jobDescription?.trim()) throw new Error("jobDescription is required");
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chunk to keep prompt size sane
    const MAX = 300;
    const trimmed = candidates.slice(0, MAX);

    const system = `You are an expert technical recruiter. Given a Job Description and a list of candidate profiles, rank the candidates that best match the JD. Only return candidates with meaningful relevance. Return STRICT JSON, no prose.`;

    const user = `Job Description:\n${jobDescription}\n\nCandidates (JSON):\n${JSON.stringify(trimmed)}\n\nReturn JSON of the form:\n{"matches":[{"id":"<candidate id>","score":0-100,"reason":"short reason"}]}\nSort by score desc. Include at most ${topK} entries. Omit candidates with score < 40.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error ${resp.status}: ${t}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { matches: [] };
    }
    const matches = Array.isArray(parsed.matches) ? parsed.matches : [];

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ai-match-candidates error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
