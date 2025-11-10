import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobTitle, department, jobType, location, experienceRequired, skills } = await req.json();

    console.log("Generating job description for:", { jobTitle, department, jobType, location });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Generate a professional and comprehensive job description and requirements for the following position:

Job Title: ${jobTitle}
${department ? `Department: ${department}` : ''}
Job Type: ${jobType}
Location: ${location}
Experience Required: ${experienceRequired}
${skills ? `Required Skills: ${skills}` : ''}

Please provide:
1. A detailed job description (3-4 paragraphs) covering role overview, responsibilities, and what the candidate will be doing
2. A comprehensive list of requirements including qualifications, skills, and experience

Format the response as JSON with two fields: "description" and "requirements".`;

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
    console.log("AI Response received");

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

    if (!parsedContent.description || !parsedContent.requirements) {
      throw new Error("Invalid response format from AI");
    }

    console.log("Successfully generated job description");

    return new Response(
      JSON.stringify({
        description: parsedContent.description,
        requirements: parsedContent.requirements,
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
