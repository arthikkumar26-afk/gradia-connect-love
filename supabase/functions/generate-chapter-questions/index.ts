import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, paperId, pdfText, sectionsConfig, selectedChapters } = await req.json();

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "extract-chapters") {
      // Extract chapters from PDF text
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a textbook chapter analyzer. Extract all chapter names/titles from the given book content. Return ONLY a valid JSON array of chapter objects.
Format: [{"id": 1, "title": "Chapter Name", "summary": "Brief 1-line summary of what this chapter covers"}]
If you cannot find clear chapters, create logical topic groupings from the content.`
            },
            {
              role: "user",
              content: `Extract chapters from this book content:\n\n${pdfText.substring(0, 30000)}`
            }
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content || "";
      
      let chapters;
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        chapters = JSON.parse(jsonMatch ? jsonMatch[1].trim() : content.trim());
      } catch {
        chapters = [{ id: 1, title: "Full Content", summary: "All content from the uploaded PDF" }];
      }

      // Update paper with chapters
      if (paperId) {
        await supabase.from("chapter_wise_papers").update({ chapters }).eq("id", paperId);
      }

      return new Response(JSON.stringify({ chapters }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate-questions") {
      if (!sectionsConfig || !Array.isArray(sectionsConfig)) {
        throw new Error("sectionsConfig is required");
      }

      const chapterNames = selectedChapters?.map((c: any) => c.title).join(", ") || "All chapters";
      
      // Build section instructions
      const sectionInstructions = sectionsConfig.map((s: any) => 
        `Section ${s.name}: ${s.questionCount} questions, ${s.marksPerQuestion} marks each, type: ${s.questionType}`
      ).join("\n");

      const totalQuestions = sectionsConfig.reduce((sum: number, s: any) => sum + s.questionCount, 0);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert exam paper creator. Generate questions from the given book content based on the section configuration. Each question must have a correct answer.

Section Configuration:
${sectionInstructions}

Question Types:
- "mcq" = Multiple choice with 4 options (A, B, C, D). Include correct_option field.
- "short_answer" = Short answer (1-2 lines). Include answer field.
- "long_answer" = Long/descriptive answer (essay type). Include answer field with detailed answer.

Chapters to cover: ${chapterNames}

Return ONLY valid JSON in this format:
{
  "sections": [
    {
      "name": "A",
      "marks_per_question": 10,
      "questions": [
        {
          "id": 1,
          "question": "Question text",
          "type": "long_answer",
          "marks": 10,
          "answer": "Detailed answer here",
          "chapter": "Chapter name"
        }
      ]
    },
    {
      "name": "B",
      "marks_per_question": 5,
      "questions": [
        {
          "id": 1,
          "question": "Question text",
          "type": "short_answer",
          "marks": 5,
          "answer": "Short answer here",
          "chapter": "Chapter name"
        }
      ]
    },
    {
      "name": "C",
      "marks_per_question": 1,
      "questions": [
        {
          "id": 1,
          "question": "Question text",
          "type": "mcq",
          "marks": 1,
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_option": "A",
          "answer": "Option A",
          "chapter": "Chapter name"
        }
      ]
    }
  ]
}`
            },
            {
              role: "user",
              content: `Generate ${totalQuestions} questions from this content:\n\n${pdfText.substring(0, 30000)}`
            }
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content || "";

      let generatedData;
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        generatedData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : content.trim());
      } catch {
        throw new Error("Failed to parse AI-generated questions");
      }

      const totalMarks = generatedData.sections?.reduce((sum: number, s: any) => 
        sum + s.questions.reduce((qSum: number, q: any) => qSum + (q.marks || 0), 0), 0) || 0;
      const totalQs = generatedData.sections?.reduce((sum: number, s: any) => sum + s.questions.length, 0) || 0;

      // Save to DB
      if (paperId) {
        await supabase.from("chapter_wise_papers").update({
          generated_questions: generatedData,
          sections_config: sectionsConfig,
          total_marks: totalMarks,
          total_questions: totalQs,
          status: "generated",
        }).eq("id", paperId);
      }

      return new Response(JSON.stringify({ questions: generatedData, totalMarks, totalQuestions: totalQs }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action. Use 'extract-chapters' or 'generate-questions'.");
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
