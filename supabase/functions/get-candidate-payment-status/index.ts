import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Latest subscription
    const { data: subs } = await admin
      .from("candidate_subscriptions")
      .select("id, plan, status, started_at, ends_at, updated_at, created_at")
      .eq("candidate_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const activeSub = subs?.find((s: any) => s.status === "active") || null;
    const latestSub = subs?.[0] || null;

    // Latest order
    const { data: orders } = await admin
      .from("razorpay_webhook_logs")
      .select(
        "id, source, event_type, status, razorpay_order_id, razorpay_payment_id, amount_paise, currency, http_status, error_message, metadata, created_at"
      )
      .eq("user_id", userId)
      .eq("source", "create-order")
      .order("created_at", { ascending: false })
      .limit(1);

    let latestPayment: any = null;
    const latestOrder = orders?.[0] || null;

    if (latestOrder?.razorpay_order_id) {
      const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
      const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        try {
          const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
          const r = await fetch(
            `https://api.razorpay.com/v1/orders/${latestOrder.razorpay_order_id}/payments`,
            { headers: { Authorization: `Basic ${auth}` } }
          );
          if (r.ok) {
            const j = await r.json();
            const items = (j.items || []) as any[];
            // Pick the most recent attempt
            const sorted = items.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
            const p = sorted[0];
            if (p) {
              latestPayment = {
                payment_id: p.id,
                status: p.status, // captured | authorized | failed | created
                amount_paise: p.amount,
                currency: p.currency,
                method: p.method,
                error_code: p.error_code,
                error_description: p.error_description,
                created_at: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
              };
            }
          }
        } catch (e) {
          console.error("[get-candidate-payment-status] razorpay fetch failed", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        subscription: {
          active: !!activeSub,
          current: activeSub || latestSub,
        },
        latest_order: latestOrder
          ? {
              order_id: latestOrder.razorpay_order_id,
              amount_paise: latestOrder.amount_paise,
              currency: latestOrder.currency,
              created_at: latestOrder.created_at,
              plan: (latestOrder.metadata as any)?.plan_name || null,
            }
          : null,
        latest_payment: latestPayment,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[get-candidate-payment-status] error", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
