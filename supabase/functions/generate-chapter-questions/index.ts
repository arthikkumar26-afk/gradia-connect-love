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
              content: `Extract chapters from this book content:\n\n${pdfText.substring(0, 50000)}`
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
        `Section ${s.name}: ${s.questionCount} questions, ${s.marksPerQuestion} marks each, type: ${s.questionType}, difficulty: ${s.difficulty || "medium"}`
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
              content: `You are an expert exam paper creator. You MUST generate questions STRICTLY from the given book/PDF content only. Do NOT create questions from your own knowledge. Every question, answer, and option must be directly derived from the provided text content.

CRITICAL RULES:
- ONLY use facts, concepts, definitions, and information present in the provided content
- Do NOT add external knowledge or information not in the text
- If the content is about a specific subject (e.g., Biology, History, Math), generate questions ONLY from what is written in the provided text
- Each question must be traceable to a specific part of the provided content

IMPORTANT: Respect the difficulty level for each section:
- "easy" = Basic recall, definitions, simple facts
- "medium" = Application-based, moderate analysis
- "hard" = Critical thinking, complex analysis, higher-order reasoning

Section Configuration:
${sectionInstructions}

Question Types:
- "mcq" = Multiple choice with 4 options (A, B, C, D). Include correct_option field.
- "short_answer" = Short answer (1-2 lines). Include answer field.
- "long_answer" = Long/descriptive answer (essay type). Include answer field with detailed answer.
- "fill_in_the_blanks" = A sentence with one word/phrase replaced by "______". Include 4 options (A, B, C, D), correct_option field, answer field, and sentence_with_blank field showing the sentence with the blank.
- "match_the_following" = Match items from Column A to Column B. Include column_a (array of items), column_b (array of shuffled items), 4 options showing different match combinations (A, B, C, D), correct_option field, and answer field with correct matching.
- "assertion_reasoning" = Assertion & Reasoning type. Include assertion field, reason field, 4 options like "(A) is true but (R) is false", "Both (A) and (R) are false", "Both (A) and (R) are true and (R) is the correct explanation of (A)", "Both (A) and (R) are true but (R) is not the correct explanation of (A)". Include correct_option (1-4), and answer field.
- "statement_based" = Read Statement I and Statement II type. Include statements array with objects [{label: "I", text: "..."}, {label: "II", text: "..."}], 4 options like "I is true but II is false", "I is false but II is true", "Both I and II are true", "Both I and II are false". Include correct_option (1-4), and answer field.

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
    },
    {
      "name": "D",
      "marks_per_question": 1,
      "questions": [
        {
          "id": 1,
          "question": "The process of ______ is essential for photosynthesis.",
          "type": "fill_in_the_blanks",
          "marks": 1,
          "sentence_with_blank": "The process of ______ is essential for photosynthesis.",
          "options": ["Respiration", "Light absorption", "Fermentation", "Digestion"],
          "correct_option": "B",
          "answer": "Light absorption",
          "chapter": "Chapter name"
        }
      ]
    },
    {
      "name": "E",
      "marks_per_question": 2,
      "questions": [
        {
          "id": 1,
          "question": "Match the following:",
          "type": "match_the_following",
          "marks": 2,
          "column_a": ["Photosynthesis", "Respiration", "Transpiration"],
          "column_b": ["Loss of water", "CO2 absorption", "O2 consumption"],
          "options": ["1-B, 2-C, 3-A", "1-A, 2-B, 3-C", "1-C, 2-A, 3-B", "1-B, 2-A, 3-C"],
          "correct_option": "A",
          "answer": "1-B, 2-C, 3-A",
          "chapter": "Chapter name"
        }
      ]
    },
    {
      "name": "F",
      "marks_per_question": 2,
      "questions": [
        {
          "id": 1,
          "question": "Read the Assertion and Reason and choose the correct option.",
          "type": "assertion_reasoning",
          "marks": 2,
          "assertion": "Photosynthesis occurs in chloroplasts.",
          "reason": "Chloroplasts contain chlorophyll which absorbs light energy.",
          "options": ["(A) is true but (R) is false", "Both (A) and (R) are false", "Both (A) and (R) are true and (R) is the correct explanation of (A)", "Both (A) and (R) are true but (R) is not the correct explanation of (A)"],
          "correct_option": "3",
          "answer": "Both (A) and (R) are true and (R) is the correct explanation of (A)",
          "chapter": "Chapter name"
        }
      ]
    },
    {
      "name": "G",
      "marks_per_question": 2,
      "questions": [
        {
          "id": 1,
          "question": "Read the statements I and II.",
          "type": "statement_based",
          "marks": 2,
          "statements": [
            {"label": "I", "text": "Due to anaemia, children do not grow well, and their energy levels are low."},
            {"label": "II", "text": "Anaemia affects both, children's physical as well as mental health."}
          ],
          "options": ["I is true but II is false", "I is false but II is true", "Both I and II are true", "Both I and II are false"],
          "correct_option": "3",
          "answer": "Both I and II are true",
          "chapter": "Chapter name"
        }
      ]
    }
  ]
}`
            },
            {
              role: "user",
              content: `Generate ${totalQuestions} questions STRICTLY from the following PDF/book content. Do NOT use any external knowledge. Every question must come from this text:\n\n${pdfText.substring(0, 50000)}`
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
        // Try multiple parsing strategies
        let jsonStr = content.trim();
        
        // Strategy 1: Extract from markdown code blocks
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        
        // Strategy 2: Find the first { and last } to extract JSON object
        if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
          const firstBrace = jsonStr.indexOf("{");
          const lastBrace = jsonStr.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          }
        }
        
        generatedData = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error("Failed to parse AI response. Raw content:", content.substring(0, 2000));
        console.error("Parse error:", parseErr);
        
        // Fallback: generate a minimal valid response matching the sections
        generatedData = {
          sections: sectionsConfig.map((s: any, idx: number) => ({
            name: s.name || String.fromCharCode(65 + idx),
            marks_per_question: s.marksPerQuestion,
            questions: Array.from({ length: s.questionCount }, (_, i) => ({
              id: i + 1,
              question: `[Question generation failed - please retry] Sample question ${i + 1} for section ${s.name}`,
              type: s.questionType,
              marks: s.marksPerQuestion,
              answer: "Please regenerate questions",
              chapter: chapterNames,
              ...(s.questionType === "mcq" || s.questionType === "fill_in_the_blanks" || s.questionType === "match_the_following" ? {
                options: ["Option A", "Option B", "Option C", "Option D"],
                correct_option: "A",
              } : {}),
              ...(s.questionType === "fill_in_the_blanks" ? {
                sentence_with_blank: "The ______ needs to be regenerated.",
              } : {}),
              ...(s.questionType === "match_the_following" ? {
                column_a: ["Item 1", "Item 2", "Item 3"],
                column_b: ["Match A", "Match B", "Match C"],
              } : {}),
              ...(s.questionType === "assertion_reasoning" ? {
                assertion: "Assertion placeholder",
                reason: "Reason placeholder",
                options: ["(A) is true but (R) is false", "Both (A) and (R) are false", "Both (A) and (R) are true and (R) is the correct explanation of (A)", "Both (A) and (R) are true but (R) is not the correct explanation of (A)"],
                correct_option: "3",
              } : {}),
              ...(s.questionType === "statement_based" ? {
                statements: [{label: "I", text: "Statement placeholder"}, {label: "II", text: "Statement placeholder"}],
                options: ["I is true but II is false", "I is false but II is true", "Both I and II are true", "Both I and II are false"],
                correct_option: "3",
              } : {}),
            })),
          })),
        };
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
