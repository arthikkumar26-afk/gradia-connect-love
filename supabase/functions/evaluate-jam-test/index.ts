import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeErrorMessage } from "../_shared/safeError.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  sessionId: string;
  stageOrder: number;
  stageName?: string;
  topic: string;
  durationSec: number;
  recordingUrl?: string | null;
  snapshotDataUrl?: string | null;
  candidateProfile?: { full_name?: string; designation?: string; role?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const {
      sessionId, stageOrder, stageName = "Just A Minute (JAM) Test",
      topic, durationSec, recordingUrl, snapshotDataUrl, candidateProfile,
    } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Build a multimodal request: pass snapshot (if any) for visual evaluation
    // of professional appearance / dressing, plus the spoken-topic context.
    const systemPrompt = `You are an expert interviewer evaluating a candidate's "Just A Minute (JAM)" round.
The candidate spoke for ${durationSec} seconds on the topic: "${topic}".
You will see a snapshot of the candidate (if provided) — judge professional appearance, dressing, grooming, posture, eye contact, framing, and lighting.
Also judge confidence and presentation based on the candidate having spoken for the full minute.
Return ONLY a JSON object with this exact shape:
{
  "overallScore": number (0-100),
  "passed": boolean (true if overallScore >= 60),
  "feedback": string (2-3 sentences),
  "strengths": string[] (3-5 short bullets),
  "improvements": string[] (3-5 short bullets),
  "appearance": { "dressing": number, "grooming": number, "posture": number, "framing": number },
  "communication": { "confidence": number, "clarity": number, "fluency": number }
}`;

    let evaluation: any = null;
    if (LOVABLE_API_KEY) {
      const userContent: any[] = [
        { type: "text", text: `Candidate: ${candidateProfile?.full_name || "N/A"} | Role: ${candidateProfile?.designation || candidateProfile?.role || "N/A"}\nTopic: ${topic}\nDuration spoken: ${durationSec}s` },
      ];
      if (snapshotDataUrl) {
        userContent.push({ type: "image_url", image_url: { url: snapshotDataUrl } });
      }

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (aiRes.ok) {
        const ai = await aiRes.json();
        const txt = ai?.choices?.[0]?.message?.content || "{}";
        try { evaluation = JSON.parse(txt); } catch { evaluation = null; }
      } else {
        console.warn("AI call failed", aiRes.status, await aiRes.text());
      }
    }

    if (!evaluation) {
      // Fallback deterministic evaluation
      const base = durationSec >= 55 ? 78 : durationSec >= 30 ? 65 : 45;
      evaluation = {
        overallScore: base,
        passed: base >= 60,
        feedback: `You spoke for ${durationSec} seconds on "${topic}". Keep practicing impromptu speaking to build confidence and structured delivery.`,
        strengths: ["Attempted the JAM round", "Maintained camera presence", "Stayed on the assigned topic"],
        improvements: ["Speak for the full minute", "Use clearer structure: intro, points, closing", "Project more confidence and vary tone"],
        appearance: { dressing: 70, grooming: 70, posture: 70, framing: 70 },
        communication: { confidence: 65, clarity: 65, fluency: 65 },
      };
    }

    // Enforce 60% pass threshold consistently
    evaluation.passed = (evaluation.overallScore ?? 0) >= 60;

    // Upsert stage result
    await supabase.from("mock_interview_stage_results").upsert({
      session_id: sessionId,
      stage_order: stageOrder,
      stage_name: stageName,
      ai_score: evaluation.overallScore,
      passed: evaluation.passed,
      ai_feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      questions: [{ id: 1, question: `JAM topic: ${topic}`, type: "text", category: "JAM" }],
      answers: [`Spoke for ${durationSec} seconds on the topic.`],
      question_scores: [],
      recording_url: recordingUrl || null,
      completed_at: new Date().toISOString(),
    }, { onConflict: "session_id,stage_order" });

    // Advance session's current_stage_order
    const nextStageOrder = stageOrder + 1;
    await supabase
      .from("mock_interview_sessions")
      .update({
        current_stage_order: nextStageOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ evaluation, nextStageOrder }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("evaluate-jam-test error:", err);
    return new Response(JSON.stringify({ error: safeErrorMessage(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
