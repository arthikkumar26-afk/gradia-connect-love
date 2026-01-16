import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    if (!ELEVENLABS_AGENT_ID) {
      throw new Error('ELEVENLABS_AGENT_ID not configured');
    }

    const { action } = await req.json();

    // Get conversation token for WebRTC connection
    if (action === 'get-token') {
      console.log('Getting ElevenLabs conversation token for agent:', ELEVENLABS_AGENT_ID);
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', errorText);
        throw new Error(`Failed to get token: ${response.status}`);
      }

      const data = await response.json();
      console.log('Token received successfully');

      return new Response(
        JSON.stringify({ token: data.token, agentId: ELEVENLABS_AGENT_ID }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signed URL for WebSocket connection (alternative)
    if (action === 'get-signed-url') {
      console.log('Getting ElevenLabs signed URL for agent:', ELEVENLABS_AGENT_ID);
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', errorText);
        throw new Error(`Failed to get signed URL: ${response.status}`);
      }

      const data = await response.json();
      console.log('Signed URL received successfully');

      return new Response(
        JSON.stringify({ signedUrl: data.signed_url, agentId: ELEVENLABS_AGENT_ID }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use "get-token" or "get-signed-url"');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in elevenlabs-demo-instructor:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
