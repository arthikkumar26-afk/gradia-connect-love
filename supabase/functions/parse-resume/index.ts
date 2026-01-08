import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract text from DOCX file
async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    
    if (!documentXml) {
      throw new Error("Could not find document.xml in DOCX");
    }
    
    // Simple XML text extraction - remove tags and decode entities
    let text = documentXml
      .replace(/<w:p[^>]*>/g, "\n") // Paragraph breaks
      .replace(/<w:br[^>]*>/g, "\n") // Line breaks
      .replace(/<w:tab[^>]*>/g, "\t") // Tabs
      .replace(/<[^>]+>/g, "") // Remove all XML tags
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, "\n\n") // Reduce multiple newlines
      .trim();
    
    return text;
  } catch (error) {
    console.error("Error extracting DOCX text:", error);
    throw new Error("Failed to extract text from Word document");
  }
}

// Extract text from DOC file (older format) - basic attempt
function extractDocText(arrayBuffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let text = decoder.decode(arrayBuffer);
    
    // Filter to printable ASCII and common characters
    text = text.replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s{3,}/g, " ")
      .trim();
    
    // If we got some reasonable text, return it
    if (text.length > 100) {
      return text;
    }
    throw new Error("Could not extract meaningful text from DOC");
  } catch {
    throw new Error("Failed to extract text from old Word format. Please convert to DOCX or PDF.");
  }
}

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
    const fileName = file.name.toLowerCase();

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
    
    const prompt = `You are an expert resume parser. Analyze this resume and extract ALL available information.

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

    // Check if it's a DOCX file (by extension or mime type)
    const isDocx = fileName.endsWith(".docx") || 
                   mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    // Check if it's an old DOC file
    const isDoc = fileName.endsWith(".doc") || mimeType === "application/msword";

    // Handle PDF files - send as base64 to vision model
    if (mimeType === "application/pdf") {
      console.log("Parsing PDF resume with vision model");
      
      // Convert to base64
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);
      
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
      
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);
      
      messageContent = [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
      ];
    }
    // Handle DOCX files - extract text first
    else if (isDocx) {
      console.log("Extracting text from DOCX file");
      const extractedText = await extractDocxText(arrayBuffer);
      console.log("Extracted text length:", extractedText.length);
      
      // Send as text-only message
      messageContent = [
        { type: "text", text: `${prompt}\n\n--- RESUME CONTENT ---\n\n${extractedText}` },
      ];
    }
    // Handle old DOC files
    else if (isDoc) {
      console.log("Attempting to extract text from DOC file");
      try {
        const extractedText = extractDocText(arrayBuffer);
        console.log("Extracted text length:", extractedText.length);
        
        messageContent = [
          { type: "text", text: `${prompt}\n\n--- RESUME CONTENT ---\n\n${extractedText}` },
        ];
      } catch {
        return new Response(
          JSON.stringify({ error: "Old Word format (.doc) is not fully supported. Please convert to .docx or PDF." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    else {
      return new Response(JSON.stringify({ error: "Unsupported file format. Please upload PDF, image, or Word document (.docx)." }), {
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