import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const MAX_TEXT_LENGTH = 5000;
const MAX_TITLE_LENGTH = 200;

function sanitizeInput(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid token provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Check if user has employer role using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'employer')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Only employers can generate job descriptions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated employer:", userId);

    const requestBody = await req.json();
    
    // Sanitize and validate all inputs
    const jobTitle = sanitizeInput(requestBody.jobTitle, MAX_TITLE_LENGTH);
    const department = sanitizeInput(requestBody.department, MAX_TITLE_LENGTH);
    const jobType = sanitizeInput(requestBody.jobType, 50);
    const location = sanitizeInput(requestBody.location, MAX_TITLE_LENGTH);
    const experienceRequired = sanitizeInput(requestBody.experienceRequired, 100);
    const inputSkills = sanitizeInput(requestBody.skills, 500);
    const isRefinement = requestBody.isRefinement === true;
    const currentDescription = sanitizeInput(requestBody.currentDescription, MAX_TEXT_LENGTH);
    const currentRequirements = sanitizeInput(requestBody.currentRequirements, MAX_TEXT_LENGTH);
    const currentSkills = sanitizeInput(requestBody.currentSkills, 500);
    const feedback = sanitizeInput(requestBody.feedback, MAX_TEXT_LENGTH);

    if (!jobTitle) {
      return new Response(
        JSON.stringify({ error: "Job title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Request type:", isRefinement ? "Refinement" : "Generation");
    console.log("Job details:", { jobTitle, department, jobType, location });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let prompt;
    
    if (isRefinement) {
      prompt = `Refine and improve the following job posting content based on the employer's feedback.

Job Title: ${jobTitle}
${department ? `Department: ${department}` : ''}
Job Type: ${jobType}
Location: ${location}
Experience Required: ${experienceRequired}

CURRENT CONTENT:
---
Description:
${currentDescription}

Requirements:
${currentRequirements}

Skills:
${currentSkills}
---

EMPLOYER'S FEEDBACK:
${feedback}

Please refine and improve the content according to the feedback while maintaining professionalism and completeness. Format the response as JSON with three fields: "description", "requirements", and "skills" (as a string with comma-separated values).`;
    } else {
      prompt = `Generate a professional and comprehensive job description, requirements, and skills for the following position:

Job Title: ${jobTitle}
${department ? `Department: ${department}` : ''}
Job Type: ${jobType}
Location: ${location}
Experience Required: ${experienceRequired}
${inputSkills ? `Suggested Skills: ${inputSkills}` : ''}

Please provide:
1. A detailed job description (3-4 paragraphs) covering role overview, responsibilities, and what the candidate will be doing
2. A comprehensive list of requirements including qualifications, experience, and certifications
3. A comma-separated list of 5-10 key technical and soft skills required for this role

Format the response as JSON with three fields: "description", "requirements", and "skills" (as a string with comma-separated values).`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert HR professional specializing in creating compelling job descriptions. Always respond with valid JSON containing 'description' and 'requirements' fields."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
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
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI Response received for user:", userId);

    const content = data.choices[0].message.content;
    
    // Try to extract JSON from the response
    let parsedContent;
    try {
      // Try direct JSON parse first
      parsedContent = JSON.parse(content);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[1]);
      } else {
        // Last resort: try to find JSON object in the text
        const objectMatch = content.match(/\{[\s\S]*"description"[\s\S]*"requirements"[\s\S]*\}/);
        if (objectMatch) {
          parsedContent = JSON.parse(objectMatch[0]);
        } else {
          throw new Error("Could not extract JSON from AI response");
        }
      }
    }

    if (!parsedContent.description || !parsedContent.requirements || !parsedContent.skills) {
      throw new Error("Invalid response format from AI");
    }

    // Ensure all fields are strings (in case AI returns arrays or other types)
    const description = typeof parsedContent.description === 'string' 
      ? parsedContent.description 
      : Array.isArray(parsedContent.description) 
        ? parsedContent.description.join('\n') 
        : String(parsedContent.description);

    const requirements = typeof parsedContent.requirements === 'string' 
      ? parsedContent.requirements 
      : Array.isArray(parsedContent.requirements) 
        ? parsedContent.requirements.join('\n') 
        : String(parsedContent.requirements);

    const skills = typeof parsedContent.skills === 'string' 
      ? parsedContent.skills 
      : Array.isArray(parsedContent.skills) 
        ? parsedContent.skills.join(', ') 
        : String(parsedContent.skills);

    console.log("Successfully generated job description, requirements, and skills");

    return new Response(
      JSON.stringify({
        description,
        requirements,
        skills,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-job-description function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate job description",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
