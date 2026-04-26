import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const message = `${orderId}|${paymentId}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Auth required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const valid = await verifySignature(razorpay_order_id, razorpay_payment_id,
      razorpay_signature, RAZORPAY_KEY_SECRET);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Signature invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, SERVICE_KEY);

    const { data: tx, error: txErr } = await admin
      .from('payment_transactions')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (txErr || !tx) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (tx.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'User mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await admin.from('payment_transactions').update({
      status: 'paid',
      razorpay_payment_id,
      razorpay_signature,
    }).eq('id', tx.id);

    // Side-effects per action
    if (tx.action_key === 'mentor_contact_unlock' && tx.related_user_id) {
      await admin.from('mentor_contact_unlocks').insert({
        candidate_id: userId,
        mentor_id: tx.related_user_id,
        points_spent: 0,
      }).then(() => null, () => null);
    } else if (tx.action_key === 'cv_unlock' && tx.related_user_id) {
      await admin.from('cv_unlocks').insert({
        employer_id: userId,
        candidate_id: tx.related_user_id,
        job_id: tx.related_entity_id || null,
        points_spent: 0,
      }).then(() => null, () => null);
    } else if (tx.action_key === 'interview_unlock' && tx.related_user_id) {
      await admin.from('interview_unlocks').insert({
        employer_id: userId,
        candidate_id: tx.related_user_id,
        interview_candidate_id: tx.related_entity_id || null,
        points_spent: 0,
      }).then(() => null, () => null);
    }

    // Fire-and-forget: email branded PDF invoice
    try {
      const actionLabels: Record<string, string> = {
        mentor_contact_unlock: 'Mentor Contact Unlock',
        cv_unlock: 'Candidate CV Unlock',
        interview_unlock: 'Interview Recording Unlock',
        wallet_topup: 'Wallet Points Top-up',
        extra_mock_test: 'Extra Mock Test',
      };
      const itemName = actionLabels[tx.action_key] || tx.action_key || 'Service';
      await admin.functions.invoke('send-payment-receipt', {
        body: {
          user_id: userId,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: tx.amount_inr,
          item_name: itemName,
          item_description: `Gradia ${itemName.toLowerCase()}`,
          item_type: tx.action_key === 'wallet_topup' ? 'wallet' : 'unlock',
        },
      });
    } catch (e) { console.error('[verify-action-payment] receipt send failed', e); }

    return new Response(JSON.stringify({
      success: true,
      action_key: tx.action_key,
      amount_inr: tx.amount_inr,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('verify-action-payment error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
