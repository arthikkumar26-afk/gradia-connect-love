// Redeems a freelancer coupon for the authenticated freelancer user.
// On success, marks coupon redeemed and activates a freelancer_subscription with
// the basic tier (coupon value = 100% off Freelancer Basic).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping from purchased coupon tier to the freelance plan it activates.
// Per spec, every coupon activates the Basic plan; tier only changes duration.
const DURATIONS: Record<string, number> = { basic: 3, plus: 6, pro: 12, elite: 12 };

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

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Coupon code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: coupon } = await db
      .from("freelancer_plan_coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();

    if (!coupon) {
      return new Response(JSON.stringify({ error: "Invalid coupon code" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (coupon.status !== "unused") {
      return new Response(JSON.stringify({ error: "Coupon already redeemed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Coupon expired" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark coupon redeemed
    const { error: updErr } = await db
      .from("freelancer_plan_coupons")
      .update({
        status: "redeemed",
        redeemed_by_user_id: userId,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", coupon.id)
      .eq("status", "unused");
    if (updErr) {
      console.error(updErr);
      return new Response(JSON.stringify({ error: "Could not redeem" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Activate freelancer subscription (Basic plan)
    const months = DURATIONS[coupon.freelancer_plan_id] || 3;
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + months);

    await db.from("freelancer_subscriptions").insert({
      freelancer_id: userId,
      plan: "basic",
      status: "active",
      source_coupon_id: coupon.id,
      ends_at: endsAt.toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      plan: "basic",
      ends_at: endsAt.toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("redeem error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
