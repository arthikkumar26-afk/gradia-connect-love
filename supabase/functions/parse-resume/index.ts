import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import pdf from "https://esm.sh/pdf-parse@1.1.1";

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

    let messageContent: any[];
    
    // Handle PDF files
    if (mimeType === "application/pdf") {
      console.log("Parsing PDF resume");
      const pdfData = await pdf(new Uint8Array(arrayBuffer));
      const extractedText = pdfData.text;
      
      if (!extractedText || extractedText.trim().length < 10) {
        return new Response(
          JSON.stringify({ error: "Could not extract text from PDF. Please try an image format or enter details manually." }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const prompt = `Analyze this resume text and extract the following information:\n- full_name\n- mobile\n- email\n- experience_level (entry|mid|senior|expert)\n- location\n- linkedin\n- preferred_role\n\nResume text:\n${extractedText}\n\nReturn only data you are confident in.`;
      
      messageContent = [{ type: "text", text: prompt }];
    } 
    // Handle image files
    else if (mimeType.startsWith("image/")) {
      console.log("Parsing image resume");
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const prompt = `Analyze this resume image and extract the following information:\n- full_name\n- mobile\n- email\n- experience_level (entry|mid|senior|expert)\n- location\n- linkedin\n- preferred_role\nReturn only data you are confident in.`;
      
      messageContent = [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
      ];
    }
    // DOC/DOCX not supported yet
    else {
      return new Response(JSON.stringify({ note: "parsing_skipped" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
                  full_name: { type: "string" },
                  mobile: { type: "string" },
                  email: { type: "string" },
                  experience_level: { 
                    type: "string", 
                    enum: ["entry", "mid", "senior", "expert"] 
                  },
                  location: { type: "string" },
                  linkedin: { type: "string" },
                  preferred_role: { type: "string" },
                },
                required: ["full_name"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_resume_data" } },
      }),
    });

    if (!response.ok) {
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse resume");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No structured data returned from AI");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

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
