// Routes AI requests to the owner's own Google AI (Gemini) key when GOOGLE_API_KEY is set,
// otherwise to the Lovable AI Gateway. Callers keep using the gateway request/response shapes:
// - /v1/chat/completions (text, tools, JSON, streaming) -> Google OpenAI-compatible endpoint
// - chat completions with modalities ["image"] -> Google native generateContent, reshaped
// - /v1/responses (streamed) -> Google chat completions, re-emitted as Responses SSE events

const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TEXT_MODEL = "gemini-3-flash-preview";

function googleModel(model: unknown): string {
  const m = String(model || "");
  if (m.startsWith("google/")) return m.slice("google/".length);
  return DEFAULT_TEXT_MODEL;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function toInlinePart(url: string): Promise<Record<string, unknown> | null> {
  const m = url.match(/^data:([^;]+);base64,(.*)$/s);
  if (m) return { inlineData: { mimeType: m[1], data: m[2] } };
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { inlineData: { mimeType: r.headers.get("content-type") || "image/png", data: btoa(bin) } };
  } catch {
    return null;
  }
}

async function generateImage(body: Record<string, any>, key: string): Promise<Response> {
  const contents: any[] = [];
  let systemText = "";
  for (const msg of body.messages || []) {
    const parts: any[] = [];
    if (typeof msg.content === "string") parts.push({ text: msg.content });
    else for (const p of msg.content || []) {
      if (p.type === "text") parts.push({ text: p.text });
      else if (p.type === "image_url" && p.image_url?.url) {
        const inline = await toInlinePart(p.image_url.url);
        if (inline) parts.push(inline);
      }
    }
    if (msg.role === "system") systemText += parts.map((p) => p.text || "").join("\n");
    else contents.push({ role: msg.role === "assistant" ? "model" : "user", parts });
  }
  const payload: Record<string, unknown> = {
    contents,
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };
  if (systemText) payload.systemInstruction = { parts: [{ text: systemText }] };
  const r = await fetch(`${GOOGLE_BASE}/models/${googleModel(body.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
  const data = await r.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join("");
  const images = parts
    .filter((p: any) => p.inlineData?.data)
    .map((p: any) => ({ type: "image_url", image_url: { url: `data:${p.inlineData.mimeType || "image/png"};base64,${p.inlineData.data}` } }));
  return jsonResponse({ choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: text, images } }] });
}

async function chatCompletions(body: Record<string, any>, key: string, signal?: AbortSignal | null): Promise<Response> {
  const payload = { ...body, model: googleModel(body.model) };
  delete payload.modalities;
  return fetch(`${GOOGLE_BASE}/openai/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
    signal: signal ?? undefined,
  });
}

async function responsesViaChat(body: Record<string, any>, key: string): Promise<Response> {
  const messages = (Array.isArray(body.input) ? body.input : [{ role: "user", content: String(body.input || "") }])
    .map((m: any) => ({ role: m.role === "developer" ? "system" : m.role, content: m.content }));
  if (body.instructions) messages.unshift({ role: "system", content: body.instructions });
  const chatBody: Record<string, unknown> = { model: googleModel(body.model), messages };
  const fmt = body.text?.format;
  if (fmt?.type === "json_schema") {
    chatBody.response_format = { type: "json_schema", json_schema: { name: fmt.name || "output", schema: fmt.schema, strict: !!fmt.strict } };
  }
  const r = await chatCompletions(chatBody, key);
  if (!r.ok) return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!body.stream) {
    return jsonResponse({ output_text: text, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] });
  }
  const sse =
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: text })}\n\n` +
    `data: ${JSON.stringify({ type: "response.completed" })}\n\n`;
  return new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

export async function aiFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const key = Deno.env.get("GOOGLE_API_KEY");
  const url = String(input);
  if (!key || !url.startsWith("https://ai.gateway.lovable.dev/")) return fetch(input, init);

  let body: Record<string, any>;
  try {
    body = JSON.parse(typeof init.body === "string" ? init.body : "{}");
  } catch {
    return fetch(input, init);
  }

  try {
    if (url.endsWith("/v1/responses")) return await responsesViaChat(body, key);
    if (url.endsWith("/v1/chat/completions")) {
      const wantsImage = Array.isArray(body.modalities) && body.modalities.includes("image");
      return wantsImage ? await generateImage(body, key) : await chatCompletions(body, key, init.signal);
    }
  } catch (e) {
    console.error("Google AI request failed:", e);
    return jsonResponse({ error: "AI service unavailable" }, 503);
  }
  return fetch(input, init);
}
