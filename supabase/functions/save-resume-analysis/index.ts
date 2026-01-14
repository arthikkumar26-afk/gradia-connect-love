import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResumeAnalysis {
  overall_score: number;
  strengths: string[];
  improvements: string[];
  experience_summary: string;
  skill_highlights: string[];
  career_level: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, analysis } = await req.json() as { user_id: string; analysis: ResumeAnalysis };

    if (!user_id || !analysis) {
      console.error('Missing required fields:', { user_id: !!user_id, analysis: !!analysis });
      return new Response(
        JSON.stringify({ error: 'Missing user_id or analysis data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving resume analysis for user:', user_id);
    console.log('Analysis data:', JSON.stringify(analysis));

    // Upsert the resume analysis
    const { data, error } = await supabaseAdmin
      .from('resume_analyses')
      .upsert({
        user_id,
        overall_score: analysis.overall_score || 0,
        career_level: analysis.career_level || null,
        experience_summary: analysis.experience_summary || null,
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
        skill_highlights: analysis.skill_highlights || [],
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error saving resume analysis:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save resume analysis', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resume analysis saved successfully:', data?.id);

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in save-resume-analysis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
