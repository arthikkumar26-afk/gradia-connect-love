// Verifies Razorpay payment for a freelance add-on purchase from a candidate
// and issues a single-use 100%-off coupon redeemable on the Freelancer platform.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const message = `${orderId}|${paymentId}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

const genCode = (planId: string) => {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `FL-${planId.toUpperCase()}-${rand}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const body = await req.json();
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      freelancer_plan_id, amount,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !freelancer_plan_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, RAZORPAY_KEY_SECRET);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    // Generate unique code (retry on collision)
    let code = genCode(freelancer_plan_id);
    for (let i = 0; i < 3; i++) {
      const { data: existing } = await db.from("freelancer_plan_coupons").select("id").eq("code", code).maybeSingle();
      if (!existing) break;
      code = genCode(freelancer_plan_id);
    }

    const { data: coupon, error: insertErr } = await db
      .from("freelancer_plan_coupons")
      .insert({
        candidate_id: userId,
        code,
        freelancer_plan_id,
        status: "unused",
        razorpay_payment_id,
        razorpay_order_id,
        amount_paid: amount,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Coupon insert failed", insertErr);
      return new Response(JSON.stringify({ error: "Could not issue coupon" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget: email coupon to candidate
    try {
      const { data: profile } = await db
        .from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
      if (profile?.email) {
        await db.functions.invoke("send-transactional-email", {
          body: {
            to: profile.email,
            subject: `Your Gradia Freelancer ${freelancer_plan_id} coupon`,
            html: `<p>Hi ${profile.full_name || "there"},</p>
              <p>Thanks for purchasing the <b>Freelancer ${freelancer_plan_id}</b> add-on.</p>
              <p>Your single-use coupon code:</p>
              <h2 style="font-family:monospace;background:#f3f4f6;padding:12px;border-radius:8px;text-align:center;">${code}</h2>
              <p>Redeem it on the Freelancer signup page to activate your plan instantly.</p>`,
            purpose: "transactional",
          },
        }).catch((e) => console.error("email send failed", e));
      }
    } catch (e) { console.error("email path failed", e); }

    return new Response(JSON.stringify({ success: true, code, coupon_id: coupon.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("issue-freelancer-coupon error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
