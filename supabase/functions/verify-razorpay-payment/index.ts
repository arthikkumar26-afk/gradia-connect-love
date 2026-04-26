import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const message = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const generatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return generatedSignature === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, SERVICE_KEY!);

  // Helper to write a structured log row
  const log = async (entry: Record<string, any>) => {
    try {
      await admin.from('razorpay_webhook_logs').insert({ source: 'verify-payment', ...entry });
    } catch (e) { console.error('[verify-razorpay-payment] log insert failed', e); }
  };

  let body: any = {};
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      await log({ event_type: 'auth.missing', status: 'failure', http_status: 401, error_message: 'No bearer token' });
      return new Response(JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      await log({ event_type: 'auth.invalid', status: 'failure', http_status: 401, error_message: claimsError?.message || 'Invalid claims' });
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    body = await req.json();
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      plan_id, plan_name, amount, employer_id, billing_cycle,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      await log({
        event_type: 'verify.missing_fields', status: 'failure', user_id: userId, http_status: 400,
        razorpay_order_id, razorpay_payment_id, request_body: body,
        error_message: 'Missing payment verification fields',
      });
      return new Response(JSON.stringify({ error: 'Missing payment verification fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (userId !== employer_id) {
      await log({
        event_type: 'verify.user_mismatch', status: 'failure', user_id: userId, http_status: 403,
        razorpay_order_id, razorpay_payment_id, request_body: body,
        error_message: `User ${userId} != employer_id ${employer_id}`,
      });
      return new Response(JSON.stringify({ error: 'Unauthorized: user mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_SECRET) {
      await log({
        event_type: 'verify.config_error', status: 'error', user_id: userId, http_status: 500,
        razorpay_order_id, razorpay_payment_id, error_message: 'RAZORPAY_KEY_SECRET not set',
      });
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, RAZORPAY_KEY_SECRET);

    if (!isValid) {
      console.error('[verify-razorpay-payment] signature failed', { razorpay_order_id, razorpay_payment_id });
      await log({
        event_type: 'signature.invalid', status: 'failure', user_id: userId, http_status: 400,
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        amount_paise: typeof amount === 'number' ? amount * 100 : null, currency: 'INR',
        signature_valid: false, error_message: 'Signature verification failed',
        request_body: body,
      });
      return new Response(JSON.stringify({ error: 'Payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, SERVICE_KEY);

    // Idempotency: if this Razorpay payment already activated a subscription, return it.
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', razorpay_payment_id)
      .maybeSingle();

    if (existing) {
      await log({
        event_type: 'verify.idempotent_replay', status: 'success', user_id: userId, http_status: 200,
        razorpay_order_id, razorpay_payment_id, signature_valid: true,
        related_table: 'subscriptions', related_id: existing.id,
        request_body: body,
      });
      return new Response(JSON.stringify({
        success: true, subscription_id: existing.id, plan_id: existing.plan_id,
        status: existing.status, idempotent: true,
        message: 'Subscription already active for this payment',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: subscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        employer_id, plan_id, plan_name,
        billing_cycle: billing_cycle || 'monthly',
        amount, currency: 'INR', status: 'active',
        payment_method: 'razorpay', stripe_subscription_id: razorpay_payment_id,
      })
      .select().single();

    if (insertError) {
      // Race-condition fallback: another concurrent verify won the unique-index insert.
      if ((insertError as any).code === '23505') {
        const { data: raced } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', razorpay_payment_id)
          .maybeSingle();
        if (raced) {
          return new Response(JSON.stringify({
            success: true, subscription_id: raced.id, plan_id: raced.plan_id,
            status: raced.status, idempotent: true,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      console.error('[verify-razorpay-payment] subscription insert failed', insertError);
      await log({
        event_type: 'verify.db_insert_failed', status: 'error', user_id: userId, http_status: 500,
        razorpay_order_id, razorpay_payment_id, signature_valid: true,
        amount_paise: typeof amount === 'number' ? amount * 100 : null, currency: 'INR',
        related_table: 'subscriptions', error_message: insertError.message,
        request_body: body,
      });
      return new Response(JSON.stringify({ error: 'Failed to activate subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[verify-razorpay-payment] success', { razorpay_order_id, subscription_id: subscription.id });
    await log({
      event_type: 'verify.success', status: 'success', user_id: userId, http_status: 200,
      razorpay_order_id, razorpay_payment_id, razorpay_signature, signature_valid: true,
      amount_paise: typeof amount === 'number' ? amount * 100 : null, currency: 'INR',
      related_table: 'subscriptions', related_id: subscription.id,
      request_body: body, response_body: { subscription_id: subscription.id },
      metadata: { plan_id, plan_name, billing_cycle: billing_cycle || 'monthly' },
    });

    return new Response(JSON.stringify({
      success: true, subscription_id: subscription.id,
      message: 'Payment verified and subscription activated',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[verify-razorpay-payment] exception', error);
    await log({
      event_type: 'verify.exception', status: 'error', http_status: 500,
      razorpay_order_id: body?.razorpay_order_id || null,
      razorpay_payment_id: body?.razorpay_payment_id || null,
      error_message: error?.message || String(error), request_body: body,
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
