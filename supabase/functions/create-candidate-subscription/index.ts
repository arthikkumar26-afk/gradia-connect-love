import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const PRICES: Record<string, number> = { starter: 999, advance: 2499, pro_accelerator: 7999, elite: 34999 };
const schema = z.object({
  plan: z.enum(['starter', 'advance', 'pro_accelerator', 'elite']),
  coupon_code: z.string().max(64).optional(),
});
const respond = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface CouponInfo {
  id: string;
  code: string;
  discount: number;
  original: number;
  final: number;
}

// Coupons are validated here (never on the client) so a discounted Razorpay plan
// can only ever be created from a code the admin panel actually issued.
async function resolveCoupon(
  admin: ReturnType<typeof createClient>,
  userId: string,
  plan: string,
  rawCode?: string,
): Promise<{ price: number; coupon: CouponInfo | null }> {
  const listPrice = PRICES[plan];
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) return { price: listPrice, coupon: null };

  const { data: row, error } = await admin
    .from('discount_coupons')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !row) throw new Error('Invalid or expired coupon code');

  const c = row as Record<string, any>;
  if (!['both', 'candidate'].includes(String(c.applicable_to))) {
    throw new Error('This coupon is not valid for candidate plans');
  }
  if (c.valid_until && new Date(c.valid_until) < new Date()) throw new Error('This coupon has expired');
  if (c.max_total_uses && Number(c.total_used) >= Number(c.max_total_uses)) {
    throw new Error('This coupon has reached its usage limit');
  }
  if (c.min_order_amount && listPrice < Number(c.min_order_amount)) {
    throw new Error(`Minimum order amount is ₹${Number(c.min_order_amount)}`);
  }

  const { count } = await admin
    .from('coupon_usages')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', c.id)
    .eq('user_id', userId);
  if (Number(c.max_uses_per_user) > 0 && (count || 0) >= Number(c.max_uses_per_user)) {
    throw new Error('You have already used this coupon');
  }

  let discount = 0;
  if (c.discount_type === 'percentage') {
    discount = Math.round((listPrice * Number(c.discount_value)) / 100);
    if (c.max_discount_amount) discount = Math.min(discount, Number(c.max_discount_amount));
  } else if (c.discount_type === 'fixed') {
    discount = Number(c.discount_value);
  } else {
    throw new Error('This coupon is not valid for plan purchases');
  }

  // Keep the contracted plan amount above zero (₹1 minimum).
  discount = Math.max(0, Math.min(discount, listPrice - 1));
  if (discount <= 0) throw new Error('This coupon does not reduce the plan price');

  return { price: listPrice - discount, coupon: { id: c.id, code: c.code, discount, original: listPrice, final: listPrice - discount } };
}

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

    let price = PRICES[plan], coupon: CouponInfo | null = null;
    try {
      const resolved = await resolveCoupon(admin, auth.user.id, plan, parsed.data.coupon_code);
      price = resolved.price;
      coupon = resolved.coupon;
    } catch (ce: any) {
      return respond({ error: ce?.message || 'Coupon could not be applied' }, 400);
    }

    const planRes = await rz('plans', {
      period: 'yearly', interval: 1,
      item: {
        name: `Gradia ${plan} plan (yearly)${coupon ? ` · ${coupon.code}` : ''}`,
        amount: price * 100,
        currency: 'INR',
      },
      notes: { plan, coupon_id: coupon?.id || '', coupon_code: coupon?.code || '', discount_rupees: coupon ? String(coupon.discount) : '0', list_price: String(PRICES[plan]) },
    });
    if (!planRes.ok) { console.error('plan', await planRes.text()); return respond({ error: 'Could not set up autopay plan' }, 502); }
    const rzPlan = await planRes.json();

    const firstChargeAt = Math.floor(Date.now() / 1000) + 86400;
    const subRes = await rz('subscriptions', {
      plan_id: rzPlan.id, total_count: 10, quantity: 1, customer_notify: 1,
      start_at: firstChargeAt,
      expire_by: firstChargeAt - 3600,
      addons: [{ item: { name: 'Autopay confirmation (non-refundable)', amount: 100, currency: 'INR' } }],
      notes: {
        candidate_id: auth.user.id, plan, setup_flow: 'nominal_confirmation', setup_amount_paise: '100',
        coupon_id: coupon?.id || '', coupon_code: coupon?.code || '', discount_rupees: coupon ? String(coupon.discount) : '0',
        list_price: String(PRICES[plan]), final_price: String(price),
      },
    });
    if (!subRes.ok) { console.error('sub', await subRes.text()); return respond({ error: 'Could not start autopay' }, 502); }
    const sub = await subRes.json();
    return respond({ subscription_id: sub.id, key_id: keyId, amount: price, confirmation_amount: 1,
      first_charge_at: firstChargeAt, confirmation_refundable: false,
      coupon: coupon ? { code: coupon.code, discount: coupon.discount, original: coupon.original, final: coupon.final } : null });
  } catch (e) {
    console.error(e);
    return respond({ error: 'Internal server error' }, 500);
  }
});
