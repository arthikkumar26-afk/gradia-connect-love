import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, fileName } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mimeType || "image/png"};base64,${imageBase64}`;

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
            content:
              `You are an OCR + Job Description structurer. Read the image (screenshot, flyer, JD poster, whiteboard, scan) and output ALL readable text as clean plain-text JD using EXACTLY these labeled sections in this order (omit a section only if truly absent). Do not add commentary, do not use markdown, do not translate. Preserve original wording.

Job Title: <one-line title>
Company: <company/organization name if visible>
Location: <city, state, country, or Remote/Hybrid/On-site>
Job Type: <one of: Full-time, Part-time, Contract, Internship, Remote, Freelance>
Experience: <e.g. 0-1 years, 2-4 years, 5+ years, Fresher>
Salary: <range or Negotiable>
Skills: <comma-separated list of skills/tools>
Responsibilities:
- <bullet 1>
- <bullet 2>
Requirements:
- <bullet 1>
- <bullet 2>
Qualifications: <degrees / certifications>
Contact: <email / phone / apply link>

Infer Job Type from context words like "internship", "part time", "remote", "contract". If multiple locations appear, join with " / ". Keep every bullet the image shows under Responsibilities/Requirements — do not merge or drop them.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract all job-related text from this image${fileName ? ` (${fileName})` : ""}.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ text }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("extract-image-text error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
