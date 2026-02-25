import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { text, pdfBase64 } = await req.json();

    if (!text && !pdfBase64) {
      return new Response(JSON.stringify({ error: "Provide text or pdfBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent = pdfBase64
      ? `Extract job posting details from this PDF content (base64 encoded). Decode and analyze it:\n\n${pdfBase64.substring(0, 50000)}`
      : `Extract job posting details from this text:\n\n${text}`;

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
            content: `You are a job posting parser. Extract structured job details from text or PDF content. Return data using the provided tool.`,
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_job_details",
              description: "Extract structured job posting details",
              parameters: {
                type: "object",
                properties: {
                  company_name: { type: "string", description: "Company or organization name" },
                  job_title: { type: "string", description: "Job title or position name" },
                  location: { type: "string", description: "Job location (city, state, or remote)" },
                  job_type: { type: "string", enum: ["full-time", "part-time", "contract", "internship", "fresher", "experienced"], description: "Type of employment" },
                  salary_range: { type: "string", description: "Salary range (e.g. 5-8 LPA)" },
                  experience_required: { type: "string", description: "Experience required (e.g. 2-4 years)" },
                  skills: { type: "string", description: "Comma-separated list of required skills" },
                  description: { type: "string", description: "Brief job description" },
                  apply_url: { type: "string", description: "Application URL if found" },
                  hr_name: { type: "string", description: "HR contact person name if mentioned" },
                  hr_contact: { type: "string", description: "HR contact phone number if mentioned" },
                },
                required: ["company_name", "job_title"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_job_details" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-external-job error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to parse" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
