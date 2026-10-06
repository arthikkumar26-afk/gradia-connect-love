import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const schema = z.object({ subscription_id: z.string().uuid(), enabled: z.boolean() }).strict();
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return respond({ error: 'Payment settings are unavailable' }, 500);
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return respond({ error: 'Please sign in' }, 401);
    const admin = createClient(url, key);
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return respond({ error: 'Please sign in again' }, 401);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) return respond({ error: 'A valid subscription and autopay choice are required' }, 400);
    const { data, error } = await admin.rpc('set_subscription_autopay', {
      p_subscription_id: body.data.subscription_id,
      p_enabled: body.data.enabled,
      p_user_id: auth.user.id,
    });
    if (error) return respond({ error: error.message }, error.code === '42501' ? 403 : 400);
    return respond({ success: true, autopay: data });
  } catch {
    return respond({ error: 'Could not save autopay settings. Please retry.' }, 500);
  }
});