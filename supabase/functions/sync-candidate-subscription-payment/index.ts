import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_IDS = new Set(["starter", "advance", "pro_accelerator", "elite"]);
const PLAN_DURATIONS: Record<string, number> = {
  starter: 1,
  advance: 3,
  pro_accelerator: 6,
  elite: 12,
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function razorpayFetch(path: string, keyId: string, keySecret: string) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(data?.error?.description || data?.error || `Razorpay request failed (${response.status})`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  const admin = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  const logAttempt = async (entry: Record<string, any>) => {
    try {
      await admin.from("subscription_activation_logs").insert(entry);
    } catch (error) {
      console.error("[sync-candidate-subscription-payment] activation log failed", error);
    }
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ activated: false, message: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ activated: false, message: "Invalid authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!razorpayKeyId || !razorpayKeySecret) throw new Error("Payment gateway not configured");

    const userId = claimsData.claims.sub;
    body = await req.json();
    const razorpayOrderId = String(body.razorpay_order_id || "");
    const razorpayPaymentId = body.razorpay_payment_id ? String(body.razorpay_payment_id) : null;
    const razorpaySignature = body.razorpay_signature ? String(body.razorpay_signature) : null;
    const plan = String(body.plan || "").toLowerCase();
    const amount = typeof body.amount === "number" ? body.amount : null;

    if (!razorpayOrderId || !PLAN_IDS.has(plan)) {
      return new Response(JSON.stringify({ activated: false, message: "Missing order or plan details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let signatureValid = false;
    if (razorpayPaymentId && razorpaySignature) {
      const expected = await hmacSha256Hex(razorpayKeySecret, `${razorpayOrderId}|${razorpayPaymentId}`);
      signatureValid = expected === razorpaySignature;
      if (!signatureValid) {
        await logAttempt({
          candidate_id: userId,
          plan,
          source: "client_verify",
          payment_id: razorpayPaymentId,
          order_id: razorpayOrderId,
          amount_paise: amount !== null ? Math.round(amount * 100) : null,
          currency: "INR",
          activation_result: "failed",
          error_message: "Payment signature verification failed",
          payload_summary: { has_signature: true, signature_valid: false },
        });
        return new Response(JSON.stringify({ activated: false, message: "Payment verification failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const order = await razorpayFetch(`/orders/${razorpayOrderId}`, razorpayKeyId, razorpayKeySecret);
    const orderNotes = order?.notes || {};
    if (orderNotes.user_id !== userId || String(orderNotes.plan_id || "").toLowerCase() !== plan) {
      await logAttempt({
        candidate_id: userId,
        plan,
        source: signatureValid ? "client_verify" : "client_poll",
        payment_id: razorpayPaymentId,
        order_id: razorpayOrderId,
        amount_paise: typeof order?.amount === "number" ? order.amount : amount !== null ? Math.round(amount * 100) : null,
        currency: order?.currency || "INR",
        activation_result: "failed",
        error_message: "Order ownership mismatch",
        payload_summary: { order_status: order?.status, order_notes: orderNotes },
      });
      return new Response(JSON.stringify({ activated: false, message: "Payment order does not match this account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payments = await razorpayFetch(`/orders/${razorpayOrderId}/payments`, razorpayKeyId, razorpayKeySecret);
    const capturedPayment = (payments?.items || []).find((payment: any) =>
      payment?.status === "captured" && (!razorpayPaymentId || payment?.id === razorpayPaymentId)
    );

    if (!capturedPayment) {
      const failedPayment = (payments?.items || []).find((payment: any) =>
        payment?.status === "failed" && (!razorpayPaymentId || payment?.id === razorpayPaymentId)
      );
      if (failedPayment) {
        await logAttempt({
          candidate_id: userId,
          plan,
          source: signatureValid ? "client_verify" : "client_poll",
          payment_id: failedPayment.id || razorpayPaymentId,
          order_id: razorpayOrderId,
          amount_paise: failedPayment?.amount ?? order?.amount ?? (amount !== null ? Math.round(amount * 100) : null),
          currency: failedPayment?.currency || order?.currency || "INR",
          activation_result: "failed",
          error_message: failedPayment?.error_description || "Payment failed in Razorpay",
          payload_summary: {
            order_status: order?.status,
            payment_status: failedPayment?.status,
            payment_method: failedPayment?.method,
            error_code: failedPayment?.error_code,
            error_reason: failedPayment?.error_reason,
          },
        });
        return new Response(JSON.stringify({ activated: false, message: failedPayment?.error_description || "Payment failed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ activated: false, message: "Payment is not captured yet" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = capturedPayment.id || razorpayPaymentId;
    const { data: existingLog } = await admin
      .from("subscription_activation_logs")
      .select("subscription_id, activation_result")
      .eq("payment_id", paymentId)
      .eq("activation_result", "success")
      .maybeSingle();

    if (existingLog?.subscription_id) {
      const { data: existingSubscription } = await admin
        .from("candidate_subscriptions")
        .select("*")
        .eq("id", existingLog.subscription_id)
        .maybeSingle();
      return new Response(JSON.stringify({ activated: true, subscription: existingSubscription, idempotent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("candidate_subscriptions")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("candidate_id", userId)
      .in("status", ["active", "trial"]);

    const startedAt = new Date();
    const endsAt = new Date(startedAt);
    endsAt.setMonth(endsAt.getMonth() + (PLAN_DURATIONS[plan] || 1));
    const { data: subscription, error: insertError } = await admin
      .from("candidate_subscriptions")
      .insert({
        candidate_id: userId,
        plan,
        status: "active",
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    await logAttempt({
      candidate_id: userId,
      plan,
      source: signatureValid ? "client_verify" : "client_poll",
      payment_id: paymentId,
      order_id: razorpayOrderId,
      amount_paise: capturedPayment?.amount ?? order?.amount ?? (amount !== null ? Math.round(amount * 100) : null),
      currency: capturedPayment?.currency || order?.currency || "INR",
      activation_result: insertError ? "failed" : "success",
      error_message: insertError?.message || null,
      subscription_id: subscription?.id || null,
      payload_summary: {
        order_status: order?.status,
        payment_status: capturedPayment?.status,
        payment_method: capturedPayment?.method,
        has_signature: Boolean(razorpaySignature),
        signature_valid: signatureValid,
      },
    });

    if (insertError) throw new Error(insertError.message);

    try {
      await admin.functions.invoke("send-payment-receipt", {
        body: {
          user_id: userId,
          payment_id: paymentId,
          order_id: razorpayOrderId,
          amount: (capturedPayment?.amount ?? order?.amount ?? 0) / 100,
          item_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
          item_description: `Candidate ${plan} plan subscription`,
          item_type: "subscription",
          user_role: "candidate",
        },
      });
    } catch (error) {
      console.error("[sync-candidate-subscription-payment] receipt send failed", error);
    }

    return new Response(JSON.stringify({ activated: true, subscription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[sync-candidate-subscription-payment] exception", error);
    await logAttempt({
      candidate_id: null,
      plan: body?.plan || null,
      source: "client_sync",
      payment_id: body?.razorpay_payment_id || null,
      order_id: body?.razorpay_order_id || null,
      amount_paise: typeof body?.amount === "number" ? Math.round(body.amount * 100) : null,
      currency: "INR",
      activation_result: "failed",
      error_message: error?.message || String(error),
      payload_summary: { exception: true },
    });
    return new Response(JSON.stringify({ activated: false, message: error?.message || "Subscription activation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
