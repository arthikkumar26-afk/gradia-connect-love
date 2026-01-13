import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helpers
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.doc'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

// PDF magic bytes
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
// PNG magic bytes
const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47];
// JPEG magic bytes
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF];
// DOCX is a ZIP file
const ZIP_MAGIC = [0x50, 0x4B, 0x03, 0x04];

function validateFileMagicBytes(buffer: ArrayBuffer, fileName: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  const ext = fileName.toLowerCase();
  
  if (ext.endsWith('.pdf')) {
    return bytes[0] === PDF_MAGIC[0] && bytes[1] === PDF_MAGIC[1] && 
           bytes[2] === PDF_MAGIC[2] && bytes[3] === PDF_MAGIC[3];
  }
  if (ext.endsWith('.png')) {
    return bytes[0] === PNG_MAGIC[0] && bytes[1] === PNG_MAGIC[1] && 
           bytes[2] === PNG_MAGIC[2] && bytes[3] === PNG_MAGIC[3];
  }
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
    return bytes[0] === JPEG_MAGIC[0] && bytes[1] === JPEG_MAGIC[1] && bytes[2] === JPEG_MAGIC[2];
  }
  if (ext.endsWith('.docx')) {
    return bytes[0] === ZIP_MAGIC[0] && bytes[1] === ZIP_MAGIC[1] && 
           bytes[2] === ZIP_MAGIC[2] && bytes[3] === ZIP_MAGIC[3];
  }
  // DOC files have various signatures, allow them through with MIME check
  if (ext.endsWith('.doc')) {
    return true;
  }
  return false;
}

// Extract text from DOCX file
async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);
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
    // Optional authentication - allow unauthenticated access for signup flow
    const authHeader = req.headers.get("Authorization");
    let userId = "anonymous";
    
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
      
      if (!claimsError && claimsData?.claims) {
        userId = claimsData.claims.sub;
      }
    }
    
    console.log("Processing resume for user:", userId);

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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File too large. Max size is 20MB." }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file extension
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return new Response(
        JSON.stringify({ error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType) && mimeType !== "application/octet-stream") {
      return new Response(
        JSON.stringify({ error: "Invalid file MIME type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file magic bytes to prevent spoofed extensions
    if (!validateFileMagicBytes(arrayBuffer, fileName)) {
      return new Response(
        JSON.stringify({ error: "File content does not match file extension" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing file:", file.name, "Type:", mimeType, "Size:", file.size, "User:", userId);

    let messageContent: any[];
    
    const prompt = `You are an expert resume parser. Analyze this resume and extract ALL available information.

CRITICAL: Extract the email address - look carefully for it in the contact section, header, or anywhere in the document. Email addresses typically contain @ symbol.

Extract these fields:
- full_name: The candidate's full name
- mobile: Phone number (with country code if available)  
- email: Email address (MUST extract this - look for @ symbol)
- date_of_birth: Date of birth if mentioned (format: YYYY-MM-DD)
- gender: Male or Female if mentioned
- experience_level: One of "Fresher (0-1 years)", "Junior (1-3 years)", "Mid-Level (3-5 years)", "Senior (5-8 years)", "Lead (8-12 years)", "Expert (12+ years)" based on total years
- location: City, State/Country (for preferred location)
- current_state: The state where candidate currently resides (Indian states)
- current_district: The district/city where candidate currently resides
- linkedin: LinkedIn profile URL if available
- preferred_role: The job title they're seeking or their current role
- skills: List of technical and soft skills as array
- languages: Languages known by the candidate as an array
- alternate_number: Secondary phone number if available
- highest_qualification: One of "High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Other"
- field_of_study: Field of study/major (e.g., Computer Science, Engineering, Commerce)
- institution: Name of university/college
- graduation_year: Year of graduation
- current_company: Current or most recent employer name
- current_role: Current or most recent job title
- total_experience: Total years of experience as number (e.g., "3")
- preferred_state: Preferred work location state
- preferred_district: Preferred work location district
- segment: Work segment/industry (Education, Healthcare, IT, Finance, Manufacturing, Retail, etc.)
- program: Employment type (Full Time, Part Time, Contract, Internship, Freelance)
- classes_handled: If teacher - classes they can teach
- batch: Preferred work timing (Morning, Afternoon, Evening, Flexible)
- primary_subject: Primary subject expertise for teaching roles
- office_type: Office preference (Head Office, Branch Office, Regional Office, Remote, Hybrid)

Be thorough - scan the entire document for contact information, educational and professional details.`;

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
                  date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
                  gender: { type: "string", enum: ["male", "female", "other"], description: "Gender" },
                  experience_level: { 
                    type: "string", 
                    enum: ["Fresher (0-1 years)", "Junior (1-3 years)", "Mid-Level (3-5 years)", "Senior (5-8 years)", "Lead (8-12 years)", "Expert (12+ years)"],
                    description: "Experience level based on total years"
                  },
                  location: { type: "string", description: "Preferred work location - City and state" },
                  current_state: { type: "string", description: "Current state of residence" },
                  current_district: { type: "string", description: "Current district/city" },
                  linkedin: { type: "string", description: "LinkedIn URL" },
                  preferred_role: { type: "string", description: "Current or desired job title" },
                  skills: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "List of skills from the resume"
                  },
                  languages: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Languages known"
                  },
                  alternate_number: { type: "string", description: "Secondary phone number" },
                  highest_qualification: { 
                    type: "string", 
                    enum: ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Other"],
                    description: "Highest education qualification"
                  },
                  field_of_study: { type: "string", description: "Field of study/major" },
                  institution: { type: "string", description: "Name of university/college" },
                  graduation_year: { type: "string", description: "Year of graduation" },
                  current_company: { type: "string", description: "Current or most recent employer" },
                  current_role: { type: "string", description: "Current or most recent job title" },
                  total_experience: { type: "string", description: "Total years of experience" },
                  preferred_state: { type: "string", description: "Preferred work state" },
                  preferred_district: { type: "string", description: "Preferred work district" },
                  segment: { type: "string", description: "Industry segment" },
                  program: { type: "string", description: "Employment type" },
                  classes_handled: { type: "string", description: "Classes taught" },
                  batch: { type: "string", description: "Work timing preference" },
                  primary_subject: { type: "string", description: "Primary teaching subject" },
                  office_type: { type: "string", description: "Office type preference" },
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
    console.log("Extracted data for user:", userId);

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
