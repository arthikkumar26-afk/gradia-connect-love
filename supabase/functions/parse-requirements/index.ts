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
- Interview Type (if pre-selected): ${interviewType || "Not specified - detect from requirements"}
- Job Title (if pre-selected): ${jobTitle || "Detect from requirements"}
- Role/Designation (if pre-selected): ${jobRole || "Detect from requirements"}

REQUIREMENT TEXT:
---
${requirementText.slice(0, 8000)}
---

Based on the above requirement text, generate a complete job vacancy with ALL of the following fields. If a field is not mentioned in the requirements, intelligently infer it from context.

IMPORTANT - For detected_interview_type, choose EXACTLY one of these values based on the job domain:
- "education" — for teaching, school, college, academic roles
- "it_corporate" — for software, IT, tech, coding, data science, cybersecurity, cloud roles
- "non_it_corporate" — for non-tech corporate roles like HR, marketing, finance, sales, operations
- "legal" — for legal, law, advocate roles
- "standard" — for general/other roles

For detected_pipeline_type, match the pipeline category within the interview type. Examples:
- For it_corporate: "software_engineer", "data_ai", "cybersecurity", "cloud_infrastructure", "qa_testing", "product_project", "uiux_design", "business_consulting", "it_support"
- For education: "academic", "non_academic"
- For non_it_corporate: "hr", "marketing", "finance", "sales", "operations", "management"
- For legal: "advocate", "legal_advisor"
- For standard: "general"

EXTRACTION RULES (very important — the source may be OCR'd from an image with labeled sections like "Job Title:", "Location:", "Job Type:", "Responsibilities:"):
- job_title: use the exact "Job Title:" line verbatim if present; otherwise infer the most specific role phrase (e.g. "Senior React Developer"). Do NOT return generic words like "Job" or "Vacancy".
- location: copy the "Location:" line verbatim (city, state, country, Remote/Hybrid). If multiple, join with " / ". If truly absent, use "Not specified".
- job_type: MUST be exactly one of Full-time | Part-time | Contract | Internship | Remote. Map: "intern"→Internship, "freelance"/"contractor"→Contract, "wfh"/"work from home"→Remote, "permanent"/"regular"→Full-time. Default to Full-time only if no signal.
- description: 2-3 paragraph overview about the role, company and impact. Do NOT dump bullets here.
- requirements: multi-line string, one requirement per line, prefixed with "- ". Include qualifications, experience, must-have skills.
- responsibilities: capture EVERY bullet under "Responsibilities:" / "Duties:" / "What you'll do" as a multi-line string, one item per line prefixed with "- ". Never merge bullets.

Return ONLY valid JSON with these fields:
{
  "job_title": "string - the job title",
  "department": "string - department name",
  "job_type": "Full-time|Part-time|Contract|Internship|Remote",
  "location": "string - job location",
  "experience_required": "0-1 years|1-3 years|3-5 years|5-8 years|8+ years",
  "salary_range": "string - salary range or Negotiable",
  "description": "string - 2-3 paragraph job description (no bullets)",
  "responsibilities": "string - bullet list, one per line prefixed with '- '",
  "requirements": "string - bullet list of requirements, one per line prefixed with '- '",
  "skills": "string - comma-separated list of 5-10 skills",
  "organisation": "string - organization name if mentioned",
  "detected_interview_type": "education|it_corporate|non_it_corporate|legal|standard",
  "detected_pipeline_type": "string - pipeline category as described above",
  "detected_role": "string - specific role/designation detected",
  "detected_sector_division": "school|college|coaching_center or null - only for education type",
  "detected_category": "academic|non_academic|research or null - only for education type",
  "detected_function": "teaching|admin|support|coaching_center or null - only for education type",
  "detected_board": "CBSE|ICSE|State Board|IB|Cambridge|Montessori|Play School|Other or null - only for education type",
  "detected_segment": "Pre-Primary|Primary|High School or null - only for education type",
  "detected_designation": "string or null - designation value for education (e.g. teacher, principal, vice_principal, cluster, dean, hod, coordinator etc.)",
  "detected_subjects": "string or null - subject like english, maths, science, social, hindi, etc.",
  "detected_classes": "string or null - class level like classes_1_2, classes_3_4_5, class_6_7_8, class_9_10 etc."
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
    if (Array.isArray(parsed.responsibilities)) parsed.responsibilities = parsed.responsibilities.join("\n");
    if (Array.isArray(parsed.skills)) parsed.skills = parsed.skills.join(", ");
    if (Array.isArray(parsed.description)) parsed.description = parsed.description.join("\n\n");

    // Normalize job_type to allowed values
    const jt = String(parsed.job_type || "").toLowerCase();
    if (/intern/.test(jt)) parsed.job_type = "Internship";
    else if (/part[\s-]?time/.test(jt)) parsed.job_type = "Part-time";
    else if (/contract|freelance|contractor|temporary/.test(jt)) parsed.job_type = "Contract";
    else if (/remote|wfh|work from home/.test(jt)) parsed.job_type = "Remote";
    else if (/full[\s-]?time|permanent|regular/.test(jt) || !jt) parsed.job_type = "Full-time";

    // Trim location; guard against empties
    if (typeof parsed.location === "string") parsed.location = parsed.location.trim();
    if (!parsed.location) parsed.location = "Not specified";

    // Merge responsibilities into requirements so the form's requirements field carries both
    if (parsed.responsibilities && typeof parsed.responsibilities === "string") {
      const resp = parsed.responsibilities.trim();
      if (resp) {
        const existing = (parsed.requirements || "").toString().trim();
        parsed.requirements = `Responsibilities:\n${resp}${existing ? `\n\nRequirements:\n${existing}` : ""}`;
      }
    }

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
