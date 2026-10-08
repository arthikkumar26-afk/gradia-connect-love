import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const PRICES: Record<string, number> = { starter: 999, advance: 2499, pro_accelerator: 7999, elite: 34999 };
const schema = z.object({ plan: z.enum(['starter', 'advance', 'pro_accelerator', 'elite']) });
const respond = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return respond({ error: 'Please sign in' }, 401);
    const url = Deno.env.get('SUPABASE_URL'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return respond({ error: 'Service unavailable' }, 500);
    const admin = createClient(url, serviceKey);
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth?.user) return respond({ error: 'Please sign in again' }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return respond({ error: 'Invalid plan' }, 400);
    const plan = parsed.data.plan;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID'), secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !secret) return respond({ error: 'Payment gateway not configured' }, 500);
    const basic = `Basic ${btoa(`${keyId}:${secret}`)}`;
    const rz = (path: string, body: unknown) => fetch(`https://api.razorpay.com/v1/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: basic }, body: JSON.stringify(body),
    });

    const planRes = await rz('plans', {
      period: 'yearly', interval: 1,
      item: { name: `Gradia ${plan} plan (yearly)`, amount: PRICES[plan] * 100, currency: 'INR' },
      notes: { plan },
    });
    if (!planRes.ok) { console.error('plan', await planRes.text()); return respond({ error: 'Could not set up autopay plan' }, 502); }
    const rzPlan = await planRes.json();

    const firstChargeAt = Math.floor(Date.now() / 1000) + 86400;
    const subRes = await rz('subscriptions', {
      plan_id: rzPlan.id, total_count: 10, quantity: 1, customer_notify: 1,
      start_at: firstChargeAt,
      expire_by: firstChargeAt - 3600,
      addons: [{ item: { name: 'Autopay confirmation (non-refundable)', amount: 100, currency: 'INR' } }],
      notes: { candidate_id: auth.user.id, plan, setup_flow: 'nominal_confirmation', setup_amount_paise: '100' },
    });
    if (!subRes.ok) { console.error('sub', await subRes.text()); return respond({ error: 'Could not start autopay' }, 502); }
    const sub = await subRes.json();
    return respond({ subscription_id: sub.id, key_id: keyId, amount: PRICES[plan], confirmation_amount: 1,
      first_charge_at: firstChargeAt, confirmation_refundable: false });
  } catch (e) {
    console.error(e);
    return respond({ error: 'Internal server error' }, 500);
  }
});
