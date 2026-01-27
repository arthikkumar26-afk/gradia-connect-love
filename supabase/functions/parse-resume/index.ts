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
    
    // Enhanced prompt - extract profile details AND analyze
    const prompt = `You are an expert resume/CV analyzer and data extractor. Analyze this resume and extract all available information.

PART 1 - EXTRACT PROFILE INFORMATION:
Extract the following fields from the resume (use null if not found):
- full_name: The candidate's full name
- email: Email address
- mobile: Phone/mobile number (digits only, no country code)
- date_of_birth: Date of birth in YYYY-MM-DD format (if mentioned)
- gender: Gender if mentioned (Male/Female/Other)
- location: Current city/location
- current_state: Current state/province
- current_district: Current district/city
- linkedin: LinkedIn profile URL
- website: Personal website/portfolio URL
- languages: Array of languages known
- skills: Array of all technical and professional skills
- highest_qualification: Highest education qualification (e.g., "B.Tech", "MBA", "PhD")
- experience_level: One of "Fresher", "0-1 years", "1-3 years", "3-5 years", "5-10 years", "10+ years"
- preferred_role: Most suitable job role based on experience

PART 2 - EXTRACT EDUCATION HISTORY:
- education: Array of objects with fields:
  - education_level: Degree type (e.g., "10th", "12th", "B.Tech", "M.Tech", "MBA")
  - school_college_name: Name of school/college
  - specialization: Branch/specialization (e.g., "Computer Science", "Commerce")
  - board_university: Board/University name
  - year_of_passing: Year of completion (number)
  - percentage_marks: Percentage or CGPA (number, convert CGPA to percentage if needed)

PART 3 - EXTRACT WORK EXPERIENCE:
- experience: Array of objects with fields:
  - organization: Company/Organization name
  - designation: Job title/role
  - department: Department worked in
  - from_date: Start date (YYYY-MM format)
  - to_date: End date (YYYY-MM format or "Present")
  - place: Location of job
  - salary_per_month: Monthly salary if mentioned (number)

PART 4 - RESUME QUALITY ANALYSIS:
Evaluate the resume based on:
1. Professional Experience - Quality and relevance of work history
2. Education & Qualifications - Academic background and certifications
3. Skills & Competencies - Technical and soft skills
4. Presentation - Resume formatting, clarity, and organization
5. Career Progression - Growth and achievements

Provide:
- overall_score: A score from 0-100 representing overall resume quality
- strengths: Array of 3-5 key strengths found in the resume
- improvements: Array of 2-4 areas for improvement
- experience_summary: Brief summary of candidate's experience (1-2 sentences)
- skill_highlights: Array of top 5-8 notable skills
- career_level: One of "Entry Level", "Junior", "Mid-Level", "Senior", "Lead", "Executive"

Return ONLY valid JSON with ALL these fields. Use null for fields that cannot be found.`;

    // Helper function for base64 encoding that handles large files
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
      return btoa(binString);
    }

    // Check if it's a DOCX file (by extension or mime type)
    const isDocx = fileName.endsWith(".docx") || 
                   mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    // Check if it's an old DOC file
    const isDoc = fileName.endsWith(".doc") || mimeType === "application/msword";

    // Handle PDF files - send as base64 to vision model
    if (mimeType === "application/pdf") {
      console.log("Parsing PDF resume with vision model");
      const base64 = arrayBufferToBase64(arrayBuffer);
      
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
      const base64 = arrayBufferToBase64(arrayBuffer);
      
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

    console.log("Sending to AI for analysis...");

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
      throw new Error("Failed to analyze resume with AI");
    }

    const data = await response.json();
    console.log("AI response received");
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in response:", JSON.stringify(data));
      throw new Error("No data returned from AI");
    }

    // Parse JSON from the response (handle markdown code blocks)
    let analysisData;
    try {
      // Clean the content - remove any non-JSON characters
      let cleanContent = content.trim();
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanContent = jsonMatch[1].trim();
      }
      
      // Find JSON object boundaries
      const jsonStart = cleanContent.indexOf('{');
      const jsonEnd = cleanContent.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = cleanContent.slice(jsonStart, jsonEnd + 1);
        analysisData = JSON.parse(jsonStr);
      } else {
        throw new Error("Could not find valid JSON in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default score if parsing fails
      analysisData = {
        overall_score: 70,
        strengths: ["Resume uploaded successfully"],
        improvements: ["Could not fully analyze - please ensure resume is clear and readable"],
        experience_summary: "Resume analysis completed",
        skill_highlights: [],
        career_level: "Mid-Level"
      };
    }

    console.log("Analysis completed for user:", userId, "Score:", analysisData.overall_score);

    return new Response(JSON.stringify(analysisData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error analyzing resume:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
