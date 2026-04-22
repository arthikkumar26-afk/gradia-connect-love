import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { action_key, related_user_id, related_entity_id, metadata } = await req.json();
    if (!action_key) {
      return new Response(JSON.stringify({ error: 'action_key required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, SERVICE_KEY);

    const { data: pricing, error: priceErr } = await admin
      .from('pricing_config')
      .select('amount_inr, label, is_active')
      .eq('action_key', action_key)
      .maybeSingle();

    if (priceErr || !pricing || !pricing.is_active) {
      return new Response(JSON.stringify({ error: 'Pricing not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const receipt = `act_${action_key.slice(0, 12)}_${Date.now()}`.slice(0, 40);

    const orderResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(Number(pricing.amount_inr) * 100),
        currency: 'INR',
        receipt,
        notes: { action_key, user_id: userId, label: pricing.label },
      }),
    });

    if (!orderResp.ok) {
      const txt = await orderResp.text();
      console.error('Razorpay order failed:', txt);
      return new Response(JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const order = await orderResp.json();

    await admin.from('payment_transactions').insert({
      user_id: userId,
      action_key,
      amount_inr: pricing.amount_inr,
      status: 'pending',
      razorpay_order_id: order.id,
      related_user_id: related_user_id || null,
      related_entity_id: related_entity_id || null,
      metadata: metadata || {},
    });

    return new Response(JSON.stringify({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID,
      label: pricing.label,
      amount_inr: pricing.amount_inr,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('create-action-payment error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
