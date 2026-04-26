// Public Razorpay webhook receiver.
// Verifies the X-Razorpay-Signature header against RAZORPAY_WEBHOOK_SECRET,
// stores a detailed log row in `razorpay_webhook_logs`, and acknowledges the event.
// IMPORTANT: deployed with verify_jwt = false (see supabase/config.toml)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-razorpay-event-id',
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function pickHeaders(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const wanted = ['x-razorpay-event-id', 'x-razorpay-signature', 'user-agent', 'content-type'];
  wanted.forEach(h => { const v = req.headers.get(h); if (v) out[h] = v; });
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, SERVICE_KEY);

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const eventId = req.headers.get('x-razorpay-event-id') || null;
  const headersJson = pickHeaders(req);

  let parsed: any = null;
  try { parsed = rawBody ? JSON.parse(rawBody) : null; } catch { parsed = { raw: rawBody?.slice(0, 2000) }; }

  const eventType = parsed?.event || 'unknown';
  const paymentEntity = parsed?.payload?.payment?.entity || null;
  const orderEntity = parsed?.payload?.order?.entity || null;
  const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id || null;
  const razorpayPaymentId = paymentEntity?.id || null;
  const amountPaise = paymentEntity?.amount ?? orderEntity?.amount ?? null;
  const currency = paymentEntity?.currency || orderEntity?.currency || null;
  const userIdNote = paymentEntity?.notes?.user_id || orderEntity?.notes?.user_id || null;

  const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  let signatureValid = false;
  let status: 'success' | 'failure' | 'error' | 'info' = 'info';
  let errorMessage: string | null = null;

  try {
    if (!WEBHOOK_SECRET) {
      status = 'error';
      errorMessage = 'RAZORPAY_WEBHOOK_SECRET not configured';
    } else if (!signature) {
      status = 'failure';
      errorMessage = 'Missing X-Razorpay-Signature header';
    } else {
      const expected = await hmacSha256Hex(WEBHOOK_SECRET, rawBody);
      signatureValid = expected === signature;
      status = signatureValid ? 'success' : 'failure';
      if (!signatureValid) errorMessage = 'Signature mismatch';
    }
  } catch (e: any) {
    status = 'error';
    errorMessage = e?.message || 'Verification error';
  }

  // Always persist a log row (even on signature failure — that itself is valuable telemetry)
  await admin.from('razorpay_webhook_logs').insert({
    source: 'webhook',
    event_type: eventType,
    status,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: signature || null,
    webhook_event_id: eventId,
    amount_paise: typeof amountPaise === 'number' ? amountPaise : null,
    currency,
    user_id: userIdNote,
    http_status: signatureValid ? 200 : 400,
    signature_valid: signatureValid,
    error_message: errorMessage,
    request_headers: headersJson,
    request_body: parsed ?? {},
    response_body: { ok: signatureValid },
    metadata: { received_at: new Date().toISOString() },
  });

  console.log('[razorpay-webhook]', {
    event: eventType,
    order_id: razorpayOrderId,
    payment_id: razorpayPaymentId,
    status,
    signatureValid,
    errorMessage,
  });

  if (!signatureValid) {
    return new Response(JSON.stringify({ ok: false, error: errorMessage || 'Invalid signature' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Activate subscription on payment.captured (server-to-server fallback when handler() never fires)
  if (eventType === 'payment.captured' && paymentEntity) {
    try {
      const notes = paymentEntity.notes || {};
      const userId = notes.user_id || userIdNote;
      const planId = (notes.plan_id || '').toString().toLowerCase();
      const flow = (notes.flow || '').toString();

      // Candidate subscription flow: notes.plan_id is set ('basic'/'pro'/etc.) and not an employer flow
      if (userId && planId && flow !== 'employer_subscription') {
        // Idempotency: skip if we've already recorded this payment_id
        const { data: existingLog } = await admin.from('razorpay_webhook_logs')
          .select('id')
          .eq('razorpay_payment_id', razorpayPaymentId)
          .eq('event_type', 'webhook.subscription_activated')
          .maybeSingle();

        if (!existingLog) {
          // Cancel any other active candidate subscriptions
          await admin.from('candidate_subscriptions')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('candidate_id', userId)
            .eq('status', 'active');

          const startedAt = new Date();
          const endsAt = new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          const { data: sub, error: insertErr } = await admin.from('candidate_subscriptions')
            .insert({
              candidate_id: userId,
              plan: planId,
              status: 'active',
              started_at: startedAt.toISOString(),
              ends_at: endsAt.toISOString(),
            })
            .select().single();

          await admin.from('razorpay_webhook_logs').insert({
            source: 'webhook',
            event_type: 'webhook.subscription_activated',
            status: insertErr ? 'error' : 'success',
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            user_id: userId,
            amount_paise: typeof amountPaise === 'number' ? amountPaise : null,
            currency,
            related_table: 'candidate_subscriptions',
            related_id: sub?.id || null,
            error_message: insertErr?.message || null,
            metadata: { plan_id: planId, activated_via: 'webhook_fallback' },
          });

          // Audit log entry for the activation attempt
          await admin.from('subscription_activation_logs').insert({
            candidate_id: userId,
            plan: planId,
            source: 'webhook',
            payment_id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount_paise: typeof amountPaise === 'number' ? amountPaise : null,
            currency,
            activation_result: insertErr ? 'failed' : 'success',
            error_message: insertErr?.message || null,
            webhook_event_id: eventId,
            subscription_id: sub?.id || null,
            payload_summary: {
              event_type: eventType,
              method: paymentEntity?.method,
              email: paymentEntity?.email,
              contact: paymentEntity?.contact,
              status: paymentEntity?.status,
            },
          });

          // Fire-and-forget receipt email
          if (!insertErr) {
            try {
              await admin.functions.invoke('send-payment-receipt', {
                body: {
                  user_id: userId,
                  payment_id: razorpayPaymentId,
                  order_id: razorpayOrderId,
                  amount: typeof amountPaise === 'number' ? amountPaise / 100 : null,
                  item_name: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan Subscription`,
                  item_description: `Candidate ${planId} plan subscription`,
                  item_type: 'subscription',
                  user_role: 'candidate',
                },
              });
            } catch (e) { console.error('[razorpay-webhook] receipt send failed', e); }
          }
        }
      }
    } catch (actErr: any) {
      console.error('[razorpay-webhook] activation error', actErr);
      await admin.from('razorpay_webhook_logs').insert({
        source: 'webhook', event_type: 'webhook.activation_exception', status: 'error',
        razorpay_payment_id: razorpayPaymentId, razorpay_order_id: razorpayOrderId,
        error_message: actErr?.message || String(actErr),
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
