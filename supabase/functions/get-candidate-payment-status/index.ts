import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_ALIASES: Record<string, string> = {
  basic: "free",
  pro: "advance",
  premium: "elite",
  proaccelerator: "pro_accelerator",
};
const PLAN_IDS = new Set(["free", "starter", "advance", "pro_accelerator", "elite"]);

const normalizePlan = (value: unknown) => {
  const raw = String(value || "").toLowerCase().trim();
  const cleaned = raw.replace(/\s+plan$/i, "").replace(/[^a-z_]/g, "");
  const normalized = PLAN_ALIASES[cleaned] || cleaned;
  return PLAN_IDS.has(normalized) ? normalized : null;
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

    const { data: subs } = await admin
      .from("candidate_subscriptions")
      .select("id, plan, status, started_at, ends_at, updated_at, created_at")
      .eq("candidate_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5);

    const { data: newestActiveSub } = await admin
      .from("candidate_subscriptions")
      .select("id, plan, status, started_at, ends_at, updated_at, created_at")
      .eq("candidate_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isSubActive = (sub: any) =>
      !!sub &&
      sub.status === "active" &&
      (!sub.ends_at || new Date(sub.ends_at).getTime() > Date.now());

    let activeSub = isSubActive(newestActiveSub) ? newestActiveSub : subs?.find(isSubActive) || null;
    let latestSub = activeSub || subs?.[0] || null;

    const { data: orders } = await admin
      .from("razorpay_webhook_logs")
      .select(
        "id, source, event_type, status, razorpay_order_id, razorpay_payment_id, amount_paise, currency, http_status, error_message, metadata, created_at"
      )
      .eq("user_id", userId)
      .eq("source", "create-order")
      .order("created_at", { ascending: false })
      .limit(10);

    let latestPayment: any = null;
    let activation: any = null;
    const latestOrder = orders?.[0] || null;
    const latestPlan = normalizePlan((latestOrder?.metadata as any)?.plan_id) || normalizePlan((latestOrder?.metadata as any)?.plan_name);

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && (orders?.length ?? 0) > 0) {
      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      // Scan recent orders to find any captured payment, not just the latest order.
      for (const order of orders!) {
        if (!order.razorpay_order_id) continue;
        try {
          const r = await fetch(
            `https://api.razorpay.com/v1/orders/${order.razorpay_order_id}/payments`,
            { headers: { Authorization: `Basic ${auth}` } }
          );
          if (!r.ok) continue;
          const j = await r.json();
          const items = ((j.items || []) as any[]).sort(
            (a, b) => (b.created_at || 0) - (a.created_at || 0)
          );

          // Surface the most recent payment attempt across the latest order only.
          if (order.id === latestOrder?.id) {
            const p = items[0];
            if (p) {
              latestPayment = {
                payment_id: p.id,
                status: p.status,
                amount_paise: p.amount,
                currency: p.currency,
                method: p.method,
                error_code: p.error_code,
                error_description: p.error_description,
                created_at: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
              };
            }
          }

          const capturedPayment = items.find((p) => p.status === "captured");
          if (!capturedPayment) continue;

          const orderPlan =
            normalizePlan((order.metadata as any)?.plan_id) ||
            normalizePlan((order.metadata as any)?.plan_name);
          if (!orderPlan) continue;
          // Never auto-downgrade to free, and never overwrite an existing
          // active paid plan (e.g. one the admin just activated manually).
          if (orderPlan === "free") continue;
          if (isSubActive(activeSub) && activeSub?.plan && activeSub.plan !== "free") {
            continue;
          }

              const { data: existingActivation } = await admin
                .from("subscription_activation_logs")
                .select("subscription_id")
                .eq("payment_id", capturedPayment.id)
                .eq("activation_result", "success")
                .maybeSingle();

              if (existingActivation?.subscription_id) {
                const { data: existingSub } = await admin
                  .from("candidate_subscriptions")
                  .select("id, plan, status, started_at, ends_at, updated_at, created_at")
                  .eq("id", existingActivation.subscription_id)
                  .maybeSingle();
                if (existingSub?.status === "active") {
                  activeSub = existingSub;
                  latestSub = existingSub;
                  activation = { activated: true, source: "existing_activation" };
                  break;
                }
              }

              // A captured paid order must upgrade the subscription even when
              // the candidate already has an active lower/free plan row.
              const activeAlreadyMatchesPayment = activeSub?.plan === orderPlan && isSubActive(activeSub);
              if (!activeAlreadyMatchesPayment) {
                const now = new Date();
                const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                await admin
                  .from("candidate_subscriptions")
                  .update({ status: "inactive", updated_at: now.toISOString() })
                  .eq("candidate_id", userId)
                  .in("status", ["active", "trial"]);

                const { data: newSub, error: subErr } = await admin
                  .from("candidate_subscriptions")
                  .insert({
                    candidate_id: userId,
                    plan: orderPlan,
                    status: "active",
                    started_at: now.toISOString(),
                    ends_at: endsAt.toISOString(),
                  })
                  .select("id, plan, status, started_at, ends_at, updated_at, created_at")
                  .single();

                await admin.from("subscription_activation_logs").insert({
                  candidate_id: userId,
                  plan: orderPlan,
                  source: "dashboard_status_refresh",
                  payment_id: capturedPayment.id,
                  order_id: order.razorpay_order_id,
                  amount_paise: capturedPayment.amount ?? order.amount_paise,
                  currency: capturedPayment.currency || order.currency || "INR",
                  activation_result: subErr ? "failed" : "success",
                  error_message: subErr?.message || null,
                  subscription_id: newSub?.id || null,
                  payload_summary: {
                    payment_status: capturedPayment.status,
                    payment_method: capturedPayment.method,
                    order_metadata: order.metadata,
                  },
                });

                if (!subErr && newSub) {
                  activeSub = newSub;
                  latestSub = newSub;
                  activation = { activated: true, source: "dashboard_status_refresh" };
                  break;
                }
                if (subErr) {
                  activation = { activated: false, error: subErr.message };
                }
              }
        } catch (e) {
          console.error("[get-candidate-payment-status] razorpay fetch/sync failed", e);
          activation = { activated: false, error: e instanceof Error ? e.message : String(e) };
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
              plan: (latestOrder.metadata as any)?.plan_name || latestPlan,
              plan_id: latestPlan,
            }
          : null,
        latest_payment: latestPayment,
        activation,
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
