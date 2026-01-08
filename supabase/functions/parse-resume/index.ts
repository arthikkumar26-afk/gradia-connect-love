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
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || "application/octet-stream";

    // Enforce 20MB limit
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "File too large. Max size is 20MB." }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing file:", file.name, "Type:", mimeType, "Size:", file.size);

    let messageContent: any[];
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    const prompt = `You are an expert resume parser. Analyze this resume document and extract ALL available information.

CRITICAL: Extract the email address - look carefully for it in the contact section, header, or anywhere in the document. Email addresses typically contain @ symbol.

Extract these fields:
- full_name: The candidate's full name
- mobile: Phone number (with country code if available)  
- email: Email address (MUST extract this - look for @ symbol)
- experience_level: One of "entry", "mid", "senior", "expert" based on years of experience
- location: City, State/Country
- linkedin: LinkedIn profile URL if available
- preferred_role: The job title they're seeking or their current role
- skills: List of technical and soft skills
- education: Highest degree and institution

Be thorough - scan the entire document for contact information.`;

    // Handle PDF files - send as base64 to vision model
    if (mimeType === "application/pdf") {
      console.log("Parsing PDF resume with vision model");
      messageContent = [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:application/pdf;base64,${base64}` },
        },
      ];
    } 
    // Handle image files
    else if (mimeType.startsWith("image/")) {
      console.log("Parsing image resume");
      messageContent = [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
      ];
    }
    // DOC/DOCX - try as binary
    else if (mimeType.includes("document") || mimeType.includes("msword")) {
      console.log("Document format detected, attempting to process");
      // For Word docs, we'll try sending as-is - the model may be able to process it
      messageContent = [
        { type: "text", text: prompt + "\n\nNote: This is a Word document." },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
      ];
    }
    else {
      return new Response(JSON.stringify({ error: "Unsupported file format. Please upload PDF, image, or Word document." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Sending to AI for parsing...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_resume_data",
              description: "Extract structured data from a resume",
              parameters: {
                type: "object",
                properties: {
                  full_name: { type: "string", description: "Candidate's full name" },
                  mobile: { type: "string", description: "Phone number" },
                  email: { type: "string", description: "Email address - look for @ symbol" },
                  experience_level: { 
                    type: "string", 
                    enum: ["entry", "mid", "senior", "expert"],
                    description: "Experience level based on years"
                  },
                  location: { type: "string", description: "City and country/state" },
                  linkedin: { type: "string", description: "LinkedIn URL" },
                  preferred_role: { type: "string", description: "Current or desired job title" },
                  skills: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "List of skills from the resume"
                  },
                  education: { type: "string", description: "Education details" },
                },
                required: ["full_name"],
                additionalProperties: false
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_resume_data" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to parse resume with AI");
    }

    const data = await response.json();
    console.log("AI response received");
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("No structured data returned from AI");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", JSON.stringify(extractedData));

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error parsing resume:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
