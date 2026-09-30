import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import JSZip from "npm:jszip@3.10.1";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function docxText(ab: ArrayBuffer) {
  const zip = await new JSZip().loadAsync(ab);
  const xml = (await zip.file("word/document.xml")?.async("string")) || "";
  return xml.replace(/<w:p[^>]*>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
}
async function pdfText(ab: ArrayBuffer) {
  const pdf = await getDocumentProxy(new Uint8Array(ab));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function aiExtract(text: string): Promise<any> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      full_name: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      location: { type: ["string", "null"], description: "City, State or City, Country" },
      preferred_role: { type: ["string", "null"], description: "Most recent or target job title" },
      experience_level: { type: ["string", "null"], description: "e.g. Fresher, 1-3 years, 5+ years" },
      skills: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "string" } },
      highest_qualification: { type: ["string", "null"] },
      current_salary: { type: ["string", "null"] },
      expected_salary: { type: ["string", "null"] },
      education: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            education_level: { type: ["string", "null"] },
            school_college_name: { type: ["string", "null"] },
            specialization: { type: ["string", "null"] },
            board_university: { type: ["string", "null"] },
            year_of_passing: { type: ["string", "null"] },
            percentage_marks: { type: ["string", "null"] },
          },
          required: ["education_level", "school_college_name", "specialization", "board_university", "year_of_passing", "percentage_marks"],
        },
      },
      experience: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            designation: { type: ["string", "null"] },
            organization: { type: ["string", "null"] },
            department: { type: ["string", "null"] },
            place: { type: ["string", "null"] },
            from_date: { type: ["string", "null"] },
            to_date: { type: ["string", "null"] },
          },
          required: ["designation", "organization", "department", "place", "from_date", "to_date"],
        },
      },
    },
    required: ["full_name", "email", "phone", "location", "preferred_role", "experience_level", "skills", "languages", "highest_qualification", "current_salary", "expected_salary", "education", "experience"],
  };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: "Extract structured profile data from this resume. Use null for unknown scalar fields and empty arrays when no entries exist. Do not invent data." },
        { role: "user", content: text.slice(0, 12000) },
      ],
      text: { format: { type: "json_schema", name: "resume_profile", schema, strict: true } },
    }),
  });
  if (!res.ok || !res.body) { console.error("AI error", res.status, await res.text()); return null; }
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = "", out = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() || "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      try { const e = JSON.parse(l.slice(5)); if (e.type === "response.output_text.delta") out += e.delta; } catch { /* skip */ }
    }
  }
  try { return JSON.parse(out); } catch { console.error("Bad AI JSON", out.slice(0, 200)); return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { resumeUrl } = await req.json();
    if (typeof resumeUrl !== "string" || !/^https:\/\//.test(resumeUrl))
      return json({ error: "Valid https resumeUrl required" }, 400);

    const fileRes = await fetch(resumeUrl);
    if (!fileRes.ok) return json({ error: "Could not download resume" }, 400);
    const ab = await fileRes.arrayBuffer();
    if (ab.byteLength > 20 * 1024 * 1024) return json({ error: "Resume too large" }, 400);

    const lower = resumeUrl.toLowerCase().split("?")[0];
    const text = lower.endsWith(".docx") ? await docxText(ab) : await pdfText(ab);
    if (!text || text.trim().length < 20) return json({ error: "No readable text in resume" }, 400);

    const data = await aiExtract(text);
    if (!data) return json({ error: "AI extraction failed" }, 500);
    return json({ profile: data });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
