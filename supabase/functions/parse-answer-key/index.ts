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
    const { pdfText, questionCount } = await req.json();
    
    if (!pdfText) {
      throw new Error('PDF text content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing answer key PDF, length:', pdfText.length);

    const systemPrompt = `You are an answer key extraction expert. Extract all answers from the given answer key PDF.

For each answer found:
1. Extract the question number it corresponds to
2. Extract the full answer text
3. Extract key words/phrases that MUST appear in a correct answer (for keyword matching)

Return a JSON array of answers with this structure:
{
  "answers": [
    {
      "question_number": 1,
      "answer_text": "The complete answer text",
      "keywords": ["keyword1", "keyword2", "key phrase"] // important words/phrases for matching
    }
  ]
}

Extract keywords that are essential to the answer - nouns, technical terms, specific values, and key concepts. These will be used for exact keyword matching against candidate responses.`;

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
          { role: 'user', content: `Extract all answers and their keywords from this answer key PDF. ${questionCount ? `There should be ${questionCount} answers.` : ''}\n\nAnswer Key Content:\n${pdfText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_answers",
              description: "Extract answers and keywords from the answer key PDF",
              parameters: {
                type: "object",
                properties: {
                  answers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_number: { type: "integer" },
                        answer_text: { type: "string" },
                        keywords: { type: "array", items: { type: "string" } }
                      },
                      required: ["question_number", "answer_text", "keywords"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["answers"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_answers" } }
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
      const answers = JSON.parse(toolCall.function.arguments);
      console.log('Extracted answers:', answers.answers?.length || 0);
      return new Response(JSON.stringify(answers), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback
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

    return new Response(JSON.stringify({ answers: [], error: 'Could not extract answers' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-answer-key:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
