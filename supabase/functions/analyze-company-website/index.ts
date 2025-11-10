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
    const { websiteUrl } = await req.json();
    
    if (!websiteUrl) {
      return new Response(
        JSON.stringify({ error: 'Website URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize the URL by adding https:// if no protocol is specified
    let normalizedUrl = websiteUrl.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    console.log(`Fetching website content for: ${normalizedUrl}`);
    
    // Fetch the website content
    let websiteContent = '';
    try {
      const websiteResponse = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GradiaBot/1.0)',
        },
      });
      
      if (!websiteResponse.ok) {
        throw new Error(`Failed to fetch website: ${websiteResponse.status}`);
      }
      
      const html = await websiteResponse.text();
      
      // Extract text content and meta tags (simple extraction)
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : html;
      
      // Remove scripts and styles
      let cleanContent = bodyContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract meta description
      const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      const metaDesc = metaDescMatch ? metaDescMatch[1] : '';
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : '';
      
      websiteContent = `Title: ${title}\nDescription: ${metaDesc}\n\nContent: ${cleanContent.substring(0, 3000)}`;
      
    } catch (fetchError) {
      console.error('Error fetching website:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch website content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing website with AI...');

    // Use AI to analyze the website content and extract company information
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing company websites and extracting key information. Extract the company name, a concise description (2-3 sentences), and identify the logo URL if visible in the HTML."
          },
          {
            role: "user",
            content: `Analyze this company website content and extract:\n1. Company name\n2. Company description (2-3 sentences summarizing what they do)\n3. Logo URL (if found in the HTML, look for common patterns like logo.png, logo.svg, or og:image)\n\nWebsite URL: ${websiteUrl}\n\nWebsite Content:\n${websiteContent}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_company_info",
              description: "Extract company information from website content",
              parameters: {
                type: "object",
                properties: {
                  companyName: {
                    type: "string",
                    description: "The name of the company"
                  },
                  description: {
                    type: "string",
                    description: "A concise 2-3 sentence description of what the company does"
                  },
                  logoUrl: {
                    type: "string",
                    description: "The URL of the company logo if found, otherwise empty string"
                  }
                },
                required: ["companyName", "description", "logoUrl"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_company_info" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze website' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call found in AI response');
      return new Response(
        JSON.stringify({ error: 'Failed to extract company information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyInfo = JSON.parse(toolCall.function.arguments);
    
    // If logo URL is relative, make it absolute
    let logoUrl = companyInfo.logoUrl || '';
    if (logoUrl && !logoUrl.startsWith('http')) {
      const urlObj = new URL(normalizedUrl);
      if (logoUrl.startsWith('/')) {
        logoUrl = `${urlObj.protocol}//${urlObj.host}${logoUrl}`;
      } else {
        logoUrl = `${urlObj.protocol}//${urlObj.host}/${logoUrl}`;
      }
    }

    // Fetch the logo and convert to base64 to avoid CORS issues
    let logoBase64 = '';
    if (logoUrl) {
      try {
        const logoResponse = await fetch(logoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GradiaBot/1.0)',
          },
        });
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(logoBlob)));
          const contentType = logoResponse.headers.get('content-type') || 'image/png';
          logoBase64 = `data:${contentType};base64,${base64}`;
        }
      } catch (logoError) {
        console.error('Failed to fetch logo:', logoError);
        // Continue without logo
      }
    }

    console.log('Extracted company info:', companyInfo);

    return new Response(
      JSON.stringify({
        companyName: companyInfo.companyName || '',
        description: companyInfo.description || '',
        logoUrl: logoBase64 || logoUrl, // Return base64 if available, otherwise URL
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-company-website function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
