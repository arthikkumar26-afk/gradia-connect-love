import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, pdfBase64, fileName, paperType, language } = await req.json();
    
    let textContent = pdfText || '';
    
    // If base64 data is provided, extract text
    if (pdfBase64 && !textContent) {
      console.log('Processing base64 file data, fileName:', fileName || 'unknown');
      try {
        // Convert base64 to Uint8Array
        const binaryString = atob(pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const ext = (fileName || '').toLowerCase();
        const isPdf = ext.endsWith('.pdf') || !ext.includes('.');
        
        if (isPdf) {
          // Try PDF extraction with unpdf
          try {
            const pdf = await getDocumentProxy(bytes);
            const { text } = await extractText(pdf, { mergePages: true });
            textContent = text;
            console.log('PDF text extracted, length:', textContent.length);
          } catch (pdfErr) {
            console.log('unpdf extraction failed, sending raw bytes as text hint');
            // Try to decode as plain text as last resort
            const decoder = new TextDecoder('utf-8', { fatal: false });
            const rawText = decoder.decode(bytes);
            // Filter printable characters
            textContent = rawText.replace(/[^\x20-\x7E\n\r\t\u0080-\uFFFF]/g, ' ').replace(/\s{3,}/g, ' ');
            console.log('Fallback text length:', textContent.length);
          }
        } else {
          // Word docs (.doc, .docx) - decode as text and let AI parse
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const rawText = decoder.decode(bytes);
          // Extract readable portions from Word XML
          textContent = rawText.replace(/[^\x20-\x7E\n\r\t\u0080-\uFFFF]/g, ' ').replace(/\s{3,}/g, ' ');
          // For docx, try to extract from XML content
          const textMatches = textContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
          if (textMatches && textMatches.length > 0) {
            textContent = textMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
            console.log('Extracted text from DOCX XML, length:', textContent.length);
          } else {
            console.log('Word file text (raw), length:', textContent.length);
          }
        }
      } catch (parseError) {
        console.error('File extraction error:', parseError);
        if (!pdfText) {
          throw new Error('Failed to extract text from file: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'));
        }
        console.log('Falling back to raw text input');
      }
    }
    
    if (!textContent) {
      throw new Error('No text content available - please provide either pdfText or pdfBase64');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing PDF text for questions, length:', textContent.length);
    console.log('First 500 chars of extracted text:', textContent.substring(0, 500));
    console.log('Last 500 chars of extracted text:', textContent.substring(Math.max(0, textContent.length - 500)));

    // Count approximate question patterns to tell AI how many to expect
    const questionPatterns = textContent.match(/(?:^|\n)\s*(?:\d+[\.\)\:]|Q\s*\d+|q\s*\d+|[ivxIVX]+[\.\)]|[a-zA-Z][\.\)])\s/gm);
    const approxCount = questionPatterns ? questionPatterns.length : 'unknown';
    console.log('Approximate question patterns detected:', approxCount);

    const systemPrompt = `You are a STRICT multilingual question extraction expert. Your ONLY job is to extract questions that ALREADY EXIST in the document text. You must NEVER create, generate, or invent any questions on your own.

CRITICAL RULES:
- ONLY extract questions that are explicitly written in the document
- Do NOT create new questions, do NOT rephrase, do NOT generate your own content
- Do NOT skip any questions. Extract EVERY SINGLE question from the document - even if there are 30, 50, or 100+ questions
- Detect questions by looking for: question marks (?), numbered items (1., 2., Q1, Q2, i., ii., a., b.), commas separating options, periods ending sentences that are clearly questions, fill-in-the-blank patterns (___), true/false patterns
- Punctuation like (,) (.) (?) (;) (:) should be used to identify question boundaries and option separators
- The content may be in ANY language including Telugu, Hindi, Tamil, or other Indian languages
- Preserve the ORIGINAL language of the questions - do NOT translate them to English
- The document appears to contain approximately ${approxCount} questions - make sure you extract ALL of them

For each question found:
1. Extract the question number (if present)
2. Extract the FULL question text EXACTLY as written in the document
3. Determine if it's multiple choice, true/false, or text answer
4. If multiple choice, extract all options EXACTLY as written

Return a JSON array of questions with this structure:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "The EXACT question text from the document",
      "question_type": "text" | "multiple_choice" | "true_false",
      "options": ["A) Option 1", "B) Option 2"] // only for multiple_choice, exactly as in document
    }
  ]
}

IMPORTANT: Do NOT stop early. Continue extracting until you have found EVERY question in the document.
Ignore headers, footers, and general instructions.
NEVER fabricate or make up questions that don't exist in the source text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 16000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract ALL questions from this ${paperType || 'question paper'} document (language: ${language || 'auto-detect'}). The document has approximately ${approxCount} questions - make sure you get every single one:\n\n${textContent}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_questions",
              description: "Extract ALL questions from the PDF text - do not skip any",
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
    console.log('AI response received, finish_reason:', data.choices?.[0]?.finish_reason);

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const questions = JSON.parse(toolCall.function.arguments);
      const extractedCount = questions.questions?.length || 0;
      console.log(`Extracted ${extractedCount} questions (expected approx ${approxCount})`);
      if (typeof approxCount === 'number' && extractedCount < approxCount * 0.7) {
        console.warn(`WARNING: Only extracted ${extractedCount} of ~${approxCount} detected questions. Possible truncation.`);
      }
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
