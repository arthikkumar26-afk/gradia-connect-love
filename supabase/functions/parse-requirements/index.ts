import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify employer role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: roleData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "employer").single();
    let isEmployer = !!roleData;
    if (!isEmployer) {
      const { data: profileData } = await supabaseAdmin
        .from("profiles").select("role").eq("id", user.id).eq("role", "employer").single();
      isEmployer = !!profileData;
    }
    if (!isEmployer) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { requirementText, interviewType, jobTitle, role: jobRole } = await req.json();

    if (!requirementText || requirementText.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Requirement text must be at least 10 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are an expert HR professional. Analyze the following job requirement text and create a complete, professional job vacancy posting.

Context:
- Interview Type: ${interviewType || "Not specified"}
- Job Title: ${jobTitle || "Detect from requirements"}
- Role/Designation: ${jobRole || "Detect from requirements"}

REQUIREMENT TEXT:
---
${requirementText.slice(0, 8000)}
---

Based on the above requirement text, generate a complete job vacancy with ALL of the following fields. If a field is not mentioned in the requirements, intelligently infer it from context.

Return ONLY valid JSON with these fields:
{
  "job_title": "string - the job title",
  "department": "string - department name",
  "job_type": "Full-time|Part-time|Contract|Internship|Remote",
  "location": "string - job location",
  "experience_required": "0-1 years|1-3 years|3-5 years|5-8 years|8+ years",
  "salary_range": "string - salary range or Negotiable",
  "description": "string - detailed 3-4 paragraph job description",
  "requirements": "string - comprehensive list of requirements",
  "skills": "string - comma-separated list of 5-10 skills",
  "organisation": "string - organization name if mentioned",
  "detected_interview_type": "education|it_corporate|standard|non_it_corporate|sales|management|legal",
  "detected_role": "string - specific role/designation detected"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert HR professional. Always respond with valid JSON only. No markdown, no code blocks." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        const objMatch = content.match(/\{[\s\S]*"job_title"[\s\S]*\}/);
        if (objMatch) parsed = JSON.parse(objMatch[0]);
        else throw new Error("Could not parse AI response");
      }
    }

    // Normalize arrays to strings
    if (Array.isArray(parsed.requirements)) parsed.requirements = parsed.requirements.join("\n");
    if (Array.isArray(parsed.skills)) parsed.skills = parsed.skills.join(", ");
    if (Array.isArray(parsed.description)) parsed.description = parsed.description.join("\n\n");

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
