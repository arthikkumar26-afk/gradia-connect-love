import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "npm:jszip@3.10.1";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function extractDocxText(ab: ArrayBuffer): Promise<string> {
  const zip = new JSZip();
  await zip.loadAsync(ab);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Could not read DOCX");
  return xml.replace(/<w:p[^>]*>/g, "\n").replace(/<w:br[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

async function extractPdfText(ab: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(ab));
  const { text } = await extractText(pdf, { mergePages: true });
  const cleaned = text.replace(/\s{3,}/g, " ").trim();
  if (cleaned.length < 80) throw new Error("Not enough text in PDF. Try a text-based PDF or DOCX.");
  return cleaned;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { fileBase64, fileName } = await req.json();
    if (!fileBase64 || !fileName) throw new Error("fileBase64 and fileName required");

    const bytes = b64ToBytes(fileBase64);
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const lower = String(fileName).toLowerCase();
    const resumeText = lower.endsWith(".docx")
      ? await extractDocxText(ab)
      : await extractPdfText(ab);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, job_title, location, job_type, salary_range, skills, description, requirements, employer_id")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(60);

    const jobList = (jobs ?? []).map((j, i) => ({
      idx: i,
      id: j.id,
      title: j.job_title,
      location: j.location,
      skills: (j.skills || []).slice(0, 15),
      summary: [j.description, j.requirements].filter(Boolean).join(" ").slice(0, 800),
    }));

    if (jobList.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You rank jobs against a candidate resume. Return ONLY the top 8 matches via the rank_jobs tool. Score 0-100 based on skills, experience, domain overlap. Be strict.`;
    const user = `RESUME:\n${resumeText.slice(0, 12000)}\n\nJOBS:\n${JSON.stringify(jobList)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "rank_jobs",
            description: "Return top matching jobs",
            parameters: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      score: { type: "integer" },
                      reason: { type: "string" },
                    },
                    required: ["id", "score", "reason"],
                  },
                },
              },
              required: ["matches"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "rank_jobs" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiResp.status}: ${t}`);
    }

    const data = await aiResp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { matches: [] };
    const jobMap = new Map((jobs ?? []).map((j: any) => [j.id, j]));

    const employerIds = [...new Set((parsed.matches || []).map((m: any) => jobMap.get(m.id)?.employer_id).filter(Boolean))];
    const { data: employers } = await supabase.from("profiles").select("id, company_name, full_name").in("id", employerIds);
    const empMap = new Map((employers ?? []).map((e: any) => [e.id, e]));

    const matches = (parsed.matches || [])
      .map((m: any) => {
        const j: any = jobMap.get(m.id);
        if (!j) return null;
        const e: any = empMap.get(j.employer_id);
        return {
          id: j.id,
          title: j.job_title,
          company: e?.company_name || e?.full_name || "Company",
          location: j.location,
          type: j.job_type,
          salary: j.salary_range,
          skills: j.skills || [],
          score: Math.max(0, Math.min(100, parseInt(m.score, 10) || 0)),
          reason: String(m.reason || ""),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 8);

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-resume-to-jobs error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
