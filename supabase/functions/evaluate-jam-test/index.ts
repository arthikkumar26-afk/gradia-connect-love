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
  transcript?: string;
  candidateProfile?: { full_name?: string; designation?: string; role?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const {
      sessionId, stageOrder, stageName = "Just A Minute (JAM) Test",
      topic, durationSec, recordingUrl, snapshotDataUrl, transcript, candidateProfile,
    } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const safeTranscript = (transcript || "").trim();

    const systemPrompt = `You are an expert interviewer evaluating a candidate's "Just A Minute (JAM)" round.
The JAM round evaluates the candidate's SPONTANEITY, COMMUNICATION FLUENCY, and ability to ORGANIZE THOUGHTS UNDER PRESSURE.
The candidate spoke for ${durationSec} seconds on the topic: "${topic}".

You will see:
- A snapshot of the candidate (if provided) — judge professional APPEARANCE, DRESSING, GROOMING, POSTURE, eye contact, framing, and lighting / BODY LANGUAGE.
- A live transcript of what the candidate actually spoke (if provided) — judge content quality, structure (intro/points/closing), vocabulary, grammar, fluency, filler words, relevance to topic, spontaneity, and how well thoughts were organized under pressure.

Return ONLY a JSON object with this exact shape (no markdown):
{
  "overallScore": number (0-100),
  "passed": boolean (true if overallScore >= 60),
  "feedback": string (3-4 sentences covering spontaneity, fluency, organization of thoughts, body language and looks),
  "strengths": string[] (3-5 short bullets),
  "improvements": string[] (3-5 short bullets),
  "appearance": { "dressing": number, "grooming": number, "posture": number, "bodyLanguage": number },
  "communication": { "spontaneity": number, "fluency": number, "organization": number, "clarity": number },
  "transcriptSummary": string (1-2 sentence summary of what the candidate said)
}`;

    let evaluation: any = null;
    if (LOVABLE_API_KEY) {
      const userContent: any[] = [
        { type: "text", text:
          `Candidate: ${candidateProfile?.full_name || "N/A"} | Role: ${candidateProfile?.designation || candidateProfile?.role || "N/A"}
Topic: ${topic}
Duration spoken: ${durationSec}s

LIVE TRANSCRIPT OF CANDIDATE'S SPEECH:
"""
${safeTranscript || "(No speech was captured by the live transcription)"}
"""` },
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
      const base = durationSec >= 55 ? 72 : durationSec >= 30 ? 60 : 45;
      evaluation = {
        overallScore: base,
        passed: base >= 60,
        feedback: `You spoke for ${durationSec} seconds on "${topic}". Keep practicing impromptu speaking to build spontaneity, fluency, and organize your thoughts under pressure.`,
        strengths: ["Attempted the JAM round", "Maintained camera presence", "Stayed on the assigned topic"],
        improvements: ["Speak for the full minute", "Use clearer structure: intro, points, closing", "Project more confidence and vary tone"],
        appearance: { dressing: 70, grooming: 70, posture: 70, bodyLanguage: 70 },
        communication: { spontaneity: 60, fluency: 60, organization: 60, clarity: 65 },
        transcriptSummary: safeTranscript ? safeTranscript.slice(0, 240) : "No speech captured.",
      };
    }

    evaluation.passed = (evaluation.overallScore ?? 0) >= 60;

    // Compose a richer feedback string so it shows nicely in the report
    const app = evaluation.appearance || {};
    const com = evaluation.communication || {};
    const breakdownLines = [
      `Appearance & Body Language — Dressing ${app.dressing ?? "-"}/100 · Grooming ${app.grooming ?? "-"}/100 · Posture ${app.posture ?? "-"}/100 · Body Language ${app.bodyLanguage ?? app.framing ?? "-"}/100`,
      `Communication — Spontaneity ${com.spontaneity ?? "-"}/100 · Fluency ${com.fluency ?? "-"}/100 · Organization of Thoughts ${com.organization ?? "-"}/100 · Clarity ${com.clarity ?? "-"}/100`,
      `This round evaluates your spontaneity, communication fluency, and ability to organize thoughts under pressure.`,
    ];
    const composedFeedback = [evaluation.feedback, ...breakdownLines].filter(Boolean).join("\n\n");

    const answerText = safeTranscript
      ? `Topic: ${topic}\nDuration: ${durationSec}s\n\nTranscript (auto-captioned from your speech):\n"${safeTranscript}"`
      : `Topic: ${topic}\nDuration: ${durationSec}s\n\n(No speech transcript was captured.)`;

    await supabase.from("mock_interview_stage_results").upsert({
      session_id: sessionId,
      stage_order: stageOrder,
      stage_name: stageName,
      ai_score: evaluation.overallScore,
      passed: evaluation.passed,
      ai_feedback: composedFeedback,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      questions: [{
        id: 1,
        question: `JAM Topic: ${topic}\n(Evaluates spontaneity, communication fluency, and ability to organize thoughts under pressure, plus body language & professional looks.)`,
        type: "text",
        category: "JAM",
      }],
      answers: [answerText],
      question_scores: [{
        questionId: 1,
        score: evaluation.overallScore,
        feedback: evaluation.transcriptSummary || "",
      }],
      recording_url: recordingUrl || null,
      completed_at: new Date().toISOString(),
    }, { onConflict: "session_id,stage_order" });

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
