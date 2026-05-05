import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { safeErrorMessage } from "../_shared/safeError.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, name } = await req.json();
    if (!prompt) throw new Error("prompt is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const system = `You generate professional HR email templates. Return STRICT JSON: {"subject": "...", "body": "..."}.
The body should be plain text (line-breaks allowed) and may use placeholders like {{candidate_name}}, {{job_title}}, {{company_name}}, {{date}}, {{time}}, {{location}}, {{hr_name}}.
Keep the tone polite and professional. No markdown, no code fences.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Template name: ${name || "Untitled"}\nInstructions: ${prompt}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI gateway error: ${res.status} ${t}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: { subject?: string; body?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { subject: name || "Update", body: content };
    }

    return new Response(
      JSON.stringify({ subject: parsed.subject || "Update", body: parsed.body || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: safeErrorMessage(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
