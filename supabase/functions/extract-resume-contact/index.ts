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

async function aiName(text: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return "";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: "Return ONLY the candidate's full name from this resume, nothing else. If unknown return an empty string." },
        { role: "user", content: text.slice(0, 3000) },
      ],
    }),
  });
  if (!res.ok || !res.body) { console.error("AI error", res.status, await res.text()); return ""; }
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
  return out.trim().replace(/^["']|["']$/g, "").slice(0, 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { fileBase64, fileName } = await req.json();
    if (typeof fileBase64 !== "string" || typeof fileName !== "string" || fileBase64.length > 8_000_000)
      return json({ error: "fileBase64 and fileName required" }, 400);
    const bin = atob(fileBase64); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ab = bytes.buffer;
    const text = fileName.toLowerCase().endsWith(".docx") ? await docxText(ab) : await pdfText(ab);
    const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] || "";
    const phone = text.match(/(\+?\d[\d\s-]{8,14}\d)/)?.[0]?.trim() || "";
    const name = await aiName(text);
    return json({ name, email, phone });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
