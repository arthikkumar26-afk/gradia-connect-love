import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
const MAX_URL_LENGTH = 2000;
const FETCH_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB max response
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB max logo

// Block private IP ranges to prevent SSRF
function isPrivateOrLocalUrl(hostname: string): boolean {
  // Block localhost and common local addresses
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return true;
  }
  
  // Block IPv6 loopback
  if (hostname === '::1' || hostname === '[::1]') {
    return true;
  }
  
  // Block private IP ranges
  const privatePatterns = [
    /^10\./,                      // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,                // 192.168.0.0/16
    /^169\.254\./,                // Link-local
    /^fc00:/i,                    // IPv6 private
    /^fe80:/i,                    // IPv6 link-local
  ];
  
  return privatePatterns.some(pattern => pattern.test(hostname));
}

function isValidUrl(urlString: string): { valid: boolean; url?: URL; error?: string } {
  if (urlString.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URL too long. Max ${MAX_URL_LENGTH} characters.` };
  }
  
  try {
    const url = new URL(urlString);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed.' };
    }
    
    // Block private IPs
    if (isPrivateOrLocalUrl(url.hostname)) {
      return { valid: false, error: 'Private/local URLs are not allowed.' };
    }
    
    return { valid: true, url };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid token provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check if user has employer role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'employer')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Only employers can use this feature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated employer:", userId);

    const { websiteUrl } = await req.json();
    
    if (!websiteUrl || typeof websiteUrl !== 'string') {
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

    // Normalize and validate the URL
    let normalizedUrl = websiteUrl.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const urlValidation = isValidUrl(normalizedUrl);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({ error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Fetching website content for: ${normalizedUrl} (user: ${userId})`);
    
    // Fetch the website content with timeout
    let websiteContent = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      
      const websiteResponse = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GradiaBot/1.0)',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!websiteResponse.ok) {
        throw new Error(`Failed to fetch website: ${websiteResponse.status}`);
      }

      // Check content length
      const contentLength = websiteResponse.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
        throw new Error('Website content too large');
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
        JSON.stringify({ error: 'Failed to fetch website content. Please check the URL.' }),
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
    console.log('AI Response received');

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

    // Validate logo URL before fetching
    let logoBase64 = '';
    if (logoUrl) {
      const logoValidation = isValidUrl(logoUrl);
      if (logoValidation.valid) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for logo
          
          const logoResponse = await fetch(logoUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; GradiaBot/1.0)',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (logoResponse.ok) {
            // Check content length
            const contentLength = logoResponse.headers.get('content-length');
            if (!contentLength || parseInt(contentLength) <= MAX_LOGO_SIZE) {
              const logoBlob = await logoResponse.arrayBuffer();
              if (logoBlob.byteLength <= MAX_LOGO_SIZE) {
                const base64 = btoa(String.fromCharCode(...new Uint8Array(logoBlob)));
                const contentType = logoResponse.headers.get('content-type') || 'image/png';
                logoBase64 = `data:${contentType};base64,${base64}`;
              }
            }
          }
        } catch (logoError) {
          console.error('Failed to fetch logo:', logoError);
          // Continue without logo
        }
      }
    }

    console.log('Extracted company info for user:', userId);

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
