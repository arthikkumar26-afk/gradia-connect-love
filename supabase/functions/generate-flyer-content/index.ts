import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job, companyName } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const jobContext = [
      job.designation && `Designation: ${job.designation}`,
      job.job_title && `Job Title: ${job.job_title}`,
      job.organisation && `Organisation: ${job.organisation}`,
      job.location && `Location: ${job.location}`,
      job.salary_range && `Salary: ${job.salary_range}`,
      job.segment && `Segment: ${job.segment}`,
      job.category && `Category: ${job.category}`,
      job.sector_division && `Sector: ${job.sector_division}`,
      companyName && `Company: ${companyName}`,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `You are a creative recruitment marketing expert. Generate compelling flyer content for a job posting. Return ONLY valid JSON, no markdown or code fences. The JSON must have these exact fields:
- headline: A short, punchy hiring headline (max 5 words, e.g. "We're Hiring Teachers!")
- tagline: An engaging tagline that attracts candidates (max 15 words)
- positions: The exact role/designation title (max 10 words, e.g. "Subject Matter Expert (SME) – Pre-Primary")
- keyPoints: An array of 4-6 short bullet points (max 12 words each) summarizing the most important job highlights. Used for compact flyers.
- responsibilities: An array of 5-8 objects { title: short bold heading (max 5 words), detail: one-line description (max 18 words) } describing core job responsibilities. Used for content-heavy flyers.
- educationalBackground: An array of 3-5 short strings describing required qualifications (max 18 words each).
- experience: An array of 1-3 short strings describing required experience (max 18 words each).
- salaryRange: A single string describing salary (e.g. "Rs.70,000/- to Rs.80,000/-"). Use job salary if provided.
- moreInformation: An array of 1-3 short strings (address, website, phone) — keep generic if unknown.
- contactEmail: A suggested professional email format like "careers@company.com" based on the company name
- website: A suggested website URL based on the company name

Make the content professional, engaging, and relevant to the recruitment sector. Use the job details to personalize the content. Do NOT include the full job description verbatim — extract structured highlights.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate flyer content for this job posting:\n\n${jobContext}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON from AI response, handling possible markdown fences
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    return new Response(JSON.stringify({ flyerContent: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-flyer-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
