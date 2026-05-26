import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan, candidate_id, candidate_email } = await req.json();

    if (!plan || !candidate_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const prices: Record<string, number> = {
      starter: 999,
      advance: 2499,
      pro_accelerator: 7999,
      elite: 34999,
    };
    const amount = prices[plan];

    if (!amount) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Step 1: Create a Razorpay Plan
    const planData = {
      period: 'monthly',
      interval: 1,
      item: {
        name: `Gradia ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        amount: amount * 100, // paise
        currency: 'INR',
      },
    };

    const planResponse = await fetch('https://api.razorpay.com/v1/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(planData),
    });

    if (!planResponse.ok) {
      const errText = await planResponse.text();
      console.error('Razorpay plan creation failed:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rzpPlan = await planResponse.json();

    // Step 2: Create a Razorpay Subscription (no trial)
    const subscriptionData: any = {
      plan_id: rzpPlan.id,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      notes: {
        candidate_id,
        plan,
      },
    };

    const subResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!subResponse.ok) {
      const errText = await subResponse.text();
      console.error('Razorpay subscription creation failed:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rzpSubscription = await subResponse.json();

    return new Response(
      JSON.stringify({
        subscription_id: rzpSubscription.id,
        key_id: RAZORPAY_KEY_ID,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
