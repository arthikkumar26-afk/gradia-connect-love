import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, paperType } = await req.json();
    
    if (!pdfText) {
      throw new Error('PDF text content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing PDF text for questions, length:', pdfText.length);

    const systemPrompt = `You are a multilingual question extraction expert. Extract all questions from the given PDF text content.
IMPORTANT: The content may be in ANY language including Telugu, Hindi, Tamil, or other Indian languages. 
Preserve the ORIGINAL language of the questions - do NOT translate them to English.

For each question found:
1. Extract the question number (if present)
2. Extract the FULL question text in its ORIGINAL language
3. Determine if it's multiple choice, true/false, or text answer
4. If multiple choice, extract all options in their ORIGINAL language

Return a JSON array of questions with this structure:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "The full question text here in ORIGINAL language",
      "question_type": "text" | "multiple_choice" | "true_false",
      "options": ["A) Option 1", "B) Option 2"] // only for multiple_choice, in original language
    }
  ]
}

Be thorough and extract ALL questions from the document. Ignore headers, footers, and instructions that are not actual questions.
If the text appears corrupted or unreadable, try to identify question patterns like numbered items (1., 2., Q1, Q2, etc.) and extract them.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract all questions from this ${paperType || 'question paper'} PDF content:\n\n${pdfText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_questions",
              description: "Extract questions from the PDF text",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_number: { type: "integer" },
                        question_text: { type: "string" },
                        question_type: { type: "string", enum: ["text", "multiple_choice", "true_false"] },
                        options: { type: "array", items: { type: "string" } }
                      },
                      required: ["question_number", "question_text", "question_type"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["questions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_questions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const questions = JSON.parse(toolCall.function.arguments);
      console.log('Extracted questions:', questions.questions?.length || 0);
      return new Response(JSON.stringify(questions), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        console.error('Failed to parse content as JSON:', e);
      }
    }

    return new Response(JSON.stringify({ questions: [], error: 'Could not extract questions' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-question-paper:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
