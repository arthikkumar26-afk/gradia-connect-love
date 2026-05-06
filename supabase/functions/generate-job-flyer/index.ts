// Generate an AI social-media flyer image for a job vacancy
// Uses Lovable AI Gateway (Gemini image model) — no API key required from user
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Body {
  job_title: string;
  company_name?: string;
  location?: string;
  experience?: string;
  salary?: string;
  skills?: string;
  highlights?: string;
  style?: string; // optional design style hint
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body.job_title || body.job_title.length < 2) {
      return new Response(JSON.stringify({ error: "job_title is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Design a vibrant, modern HIRING / "We're Hiring" social-media flyer (1:1 square) for the role below. Bold typography, professional color palette, eye-catching layout suitable for Instagram, LinkedIn and WhatsApp. Include the role title prominently and small supporting details. Do NOT add any logos.

Job Title: ${body.job_title}
${body.company_name ? `Company: ${body.company_name}` : ""}
${body.location ? `Location: ${body.location}` : ""}
${body.experience ? `Experience: ${body.experience}` : ""}
${body.salary ? `Salary: ${body.salary}` : ""}
${body.skills ? `Key Skills: ${body.skills}` : ""}
${body.highlights ? `Highlights: ${body.highlights}` : ""}
Style: ${body.style || "modern, bold, professional, gradient accents"}.
Add an "Apply Now" call-to-action.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${r.status} ${txt}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image generated", raw: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ image_url: imageUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
