import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile, resumeText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a portfolio generator. Based on the following resume/profile data, generate a professional freelancer portfolio.

Profile Data:
- Name: ${profile?.full_name || "Unknown"}
- Email: ${profile?.email || ""}
- Mobile: ${profile?.mobile || ""}
- Location: ${profile?.location || ""}
- Qualification: ${profile?.highest_qualification || ""}
- Experience Level: ${profile?.experience_level || ""}
- Preferred Role: ${profile?.preferred_role || ""}
- Primary Subject: ${profile?.primary_subject || ""}
- Skills from resume: ${resumeText || "Not provided"}

Generate a JSON response with these fields:
- tagline: A professional one-line tagline (max 80 chars)
- bio: A 3-4 sentence professional bio highlighting experience and expertise
- skills: An array of 5-10 relevant technical/professional skills
- website: Personal website URL if found in resume, otherwise empty string
- github: GitHub profile URL if found in resume, otherwise empty string
- linkedin: LinkedIn profile URL if found in resume, otherwise empty string
- twitter: Twitter/X profile URL if found in resume, otherwise empty string
- projects: An array of 2-4 portfolio project entries extracted or inferred from their experience, each with:
  - title: project name
  - description: 2-3 sentence description
  - tech_stack: array of technologies used
  - project_url: URL if mentioned, otherwise empty string
  - start_date: project start date in YYYY-MM-DD format if inferable from resume, otherwise empty string
  - end_date: project end date in YYYY-MM-DD format if inferable (use empty string if ongoing/current)

Extract as many details as possible from the resume. For dates, infer from work experience timelines mentioned in the resume.

Return ONLY valid JSON, no markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You generate professional portfolio content. Always return valid JSON only." },
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
    
    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-portfolio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
