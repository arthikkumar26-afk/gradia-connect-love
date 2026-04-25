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
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, SERVICE_KEY);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { amount, currency, plan_id, plan_name, employer_id, receipt } = body;

    if (!amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (employer_id && userId !== employer_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: user mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('[create-razorpay-order] credentials not configured');
      await admin.from('razorpay_webhook_logs').insert({
        source: 'create-order', event_type: 'order.config_error', status: 'error',
        user_id: userId, amount_paise: amount * 100, currency: currency || 'INR',
        error_message: 'Razorpay credentials not configured', request_body: body,
      });
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeReceipt = receipt && receipt.length <= 40
      ? receipt
      : `ord_${(plan_id || 'wallet').slice(0, 8)}_${Date.now()}`;

    const orderData = {
      amount: amount * 100,
      currency: currency || 'INR',
      receipt: safeReceipt,
      notes: {
        plan_id: plan_id || '',
        plan_name: plan_name || '',
        user_id: userId,
      },
    };

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[create-razorpay-order] order creation failed:', errorText);
      await admin.from('razorpay_webhook_logs').insert({
        source: 'create-order', event_type: 'order.create_failed', status: 'failure',
        user_id: userId, amount_paise: amount * 100, currency: currency || 'INR',
        http_status: response.status, error_message: errorText.slice(0, 1000),
        request_body: body, response_body: { raw: errorText.slice(0, 2000) },
      });
      return new Response(
        JSON.stringify({ error: 'Failed to create payment order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = await response.json();
    console.log('[create-razorpay-order] order created', { order_id: order.id, amount: order.amount, user_id: userId });

    await admin.from('razorpay_webhook_logs').insert({
      source: 'create-order', event_type: 'order.created', status: 'success',
      razorpay_order_id: order.id,
      user_id: userId,
      amount_paise: order.amount, currency: order.currency,
      http_status: 200,
      request_body: body,
      response_body: { id: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt, status: order.status },
      metadata: { plan_id: plan_id || null, plan_name: plan_name || null, receipt: safeReceipt },
    });

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: RAZORPAY_KEY_ID,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[create-razorpay-order] internal error:', error);
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const admin = createClient(supabaseUrl, SERVICE_KEY);
      await admin.from('razorpay_webhook_logs').insert({
        source: 'create-order', event_type: 'order.exception', status: 'error',
        error_message: error?.message || String(error),
      });
    } catch (_) { /* swallow */ }
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
