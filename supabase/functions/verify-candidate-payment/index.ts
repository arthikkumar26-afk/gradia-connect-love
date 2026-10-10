import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const PaymentSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/).optional(),
  razorpay_subscription_id: z.string().regex(/^sub_[A-Za-z0-9]+$/).optional(),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
  plan: z.enum(['starter', 'advance', 'pro_accelerator', 'elite']),
  amount: z.number().finite().nonnegative(),
  candidate_id: z.string().uuid(),
}).refine(b => Boolean(b.razorpay_order_id) !== Boolean(b.razorpay_subscription_id), 'Provide one payment reference');

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

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Service unavailable');
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await authSupabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    const parsed = PaymentSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return new Response(JSON.stringify({ error: 'Invalid payment verification details' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const {
      razorpay_order_id,
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      amount,
      candidate_id,
    } = parsed.data;

    if ((!razorpay_order_id && !razorpay_subscription_id) || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing payment verification fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authenticated user matches candidate_id
    if (userId !== candidate_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: user mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Subscription (autopay) signature = HMAC(payment_id|subscription_id); order = HMAC(order_id|payment_id)
    const isValid = razorpay_subscription_id
      ? await verifySignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature, RAZORPAY_KEY_SECRET)
      : razorpay_order_id ? await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, RAZORPAY_KEY_SECRET) : false;

    if (!isValid) {
      console.error('Payment signature verification failed');
      return new Response(
        JSON.stringify({ error: 'Payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (razorpay_subscription_id) {
      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      if (!keyId) throw new Error('Payment gateway not configured');
      const r = await fetch(`https://api.razorpay.com/v1/subscriptions/${razorpay_subscription_id}`, {
        headers: { Authorization: `Basic ${btoa(`${keyId}:${RAZORPAY_KEY_SECRET}`)}` },
      });
      const sub = r.ok ? await r.json() : null;
      if (!sub || sub.notes?.candidate_id !== candidate_id || sub.notes?.plan !== plan) {
        return new Response(JSON.stringify({ error: 'Subscription does not match this plan' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // The nominal payment authorizes future debits; it is not a paid plan purchase.
      // Only subscription.charged grants access after Razorpay collects the full plan amount.
      if (sub.notes?.setup_flow === 'nominal_confirmation') {
        if (!['authenticated', 'active'].includes(sub.status)) {
          return new Response(JSON.stringify({ error: 'Autopay authorization is not confirmed yet' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // The mandate is live, so the coupon that lowered this plan is now spent.
        const couponId = sub.notes?.coupon_id;
        if (couponId && SUPABASE_SERVICE_ROLE_KEY) {
          const svc = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);
          const { data: used } = await svc.from('coupon_usages').select('id')
            .eq('coupon_id', couponId).eq('user_id', candidate_id).limit(1).maybeSingle();
          if (!used) {
            await svc.from('coupon_usages').insert({
              coupon_id: couponId,
              user_id: candidate_id,
              user_role: 'candidate',
              plan_name: `${plan} (yearly autopay)`,
              discount_applied: Number(sub.notes.discount_rupees) || 0,
              original_amount: Number(sub.notes.list_price) || 0,
              final_amount: Number(sub.notes.final_price) || 0,
            });
            try { await svc.rpc('increment_coupon_usage', { coupon_id_input: couponId }); } catch {}
          }
        }
        return new Response(JSON.stringify({ success: true, autopay_authorized: true,
          plan_activated: false, first_charge_at: sub.start_at,
          message: 'Autopay confirmed. Paid access begins after the full plan charge succeeds.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Service unavailable');
    const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);

    // Deactivate any existing active subscription
    await supabase
      .from('candidate_subscriptions')
      .update({ status: 'inactive' })
      .eq('candidate_id', candidate_id)
      .eq('status', 'active');

    // Calculate end date (1 year from now — annual plan)
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 365);

    // Insert new subscription
    const { data: subscription, error: insertError } = await supabase
      .from('candidate_subscriptions')
      .insert({
        candidate_id,
        plan,
        status: 'active',
        started_at: new Date().toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create candidate subscription:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to activate subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fire-and-forget: email branded PDF invoice
    try {
      await supabase.functions.invoke('send-payment-receipt', {
        body: {
          user_id: candidate_id,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount,
          item_name: `Candidate ${plan} Plan`,
          item_description: `Gradia candidate subscription – ${plan}`,
          item_type: 'subscription',
          user_role: 'candidate',
        },
      });
    } catch (e) { console.error('[verify-candidate-payment] receipt send failed', e); }

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        message: `${plan} plan activated successfully`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying candidate payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
